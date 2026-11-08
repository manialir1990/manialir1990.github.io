-- ============================================================
-- Expense site, part 2: merge requests (shared dashboard)
-- Run ONCE in Supabase SQL Editor, after schema.sql.
-- Safe to run again. Only fin_ objects are created or changed.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Only users who really opened this site can be found by name
-- ------------------------------------------------------------
alter table public.fin_profiles
  add column if not exists site_user boolean not null default false;


-- ------------------------------------------------------------
-- 2) fin_merge_requests
--    status: pending, accepted, rejected, cancelled, ended
-- ------------------------------------------------------------
create table if not exists public.fin_merge_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users (id) on delete cascade,
  target_id     uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'ended')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint fin_merge_not_self check (requester_id <> target_id)
);

create index if not exists fin_merge_requester_idx on public.fin_merge_requests (requester_id);
create index if not exists fin_merge_target_idx    on public.fin_merge_requests (target_id);

-- one open (pending or accepted) request per pair of users
create unique index if not exists fin_merge_one_open_pair_idx
  on public.fin_merge_requests (least(requester_id, target_id), greatest(requester_id, target_id))
  where status in ('pending', 'accepted');

alter table public.fin_merge_requests enable row level security;
alter table public.fin_merge_requests force row level security;

drop policy if exists "fin_merge_select_participant" on public.fin_merge_requests;

create policy "fin_merge_select_participant" on public.fin_merge_requests
  for select to authenticated
  using ((select auth.uid()) in (requester_id, target_id));

-- no insert/update/delete policies: all writes go through the functions below
revoke all on public.fin_merge_requests from anon;
revoke all on public.fin_merge_requests from authenticated;
grant select on public.fin_merge_requests to authenticated;


-- ------------------------------------------------------------
-- 3) Helper: is the current user merged with another user?
-- ------------------------------------------------------------
create or replace function public.fin_is_merged_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.fin_merge_requests m
    where m.status = 'accepted'
      and (
        (m.requester_id = auth.uid() and m.target_id = other)
        or (m.target_id = auth.uid() and m.requester_id = other)
      )
  );
$$;

-- merged partners may READ each other's entries (never change them)
drop policy if exists "fin_entries_select_merged" on public.fin_entries;

create policy "fin_entries_select_merged" on public.fin_entries
  for select to authenticated
  using (public.fin_is_merged_with(user_id));


-- ------------------------------------------------------------
-- 4) Find users by EXACT full name (3+ characters, max 5 results)
--    Returns a masked e-mail so same-name users can be told apart.
-- ------------------------------------------------------------
create or replace function public.fin_find_users(q text)
returns table (found_id uuid, found_name text, found_email text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cleaned text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  cleaned := regexp_replace(
    translate(lower(btrim(coalesce(q, ''))), U&'\064A\0643', U&'\06CC\06A9'),
    '\s+', ' ', 'g');

  if char_length(cleaned) < 3 then
    return;
  end if;

  return query
    select
      p.id,
      p.full_name,
      (case
         when position('@' in u.email) > 3
           then substr(u.email, 1, 2) || '***' || substr(u.email, position('@' in u.email))
         else '***' || substr(u.email, position('@' in u.email))
       end)::text
    from public.fin_profiles p
    join auth.users u on u.id = p.id
    where p.site_user
      and p.id <> auth.uid()
      and regexp_replace(
            translate(lower(btrim(coalesce(p.full_name, ''))), U&'\064A\0643', U&'\06CC\06A9'),
            '\s+', ' ', 'g') = cleaned
    limit 5;
end;
$$;


-- ------------------------------------------------------------
-- 5) Send a merge request
-- ------------------------------------------------------------
create or replace function public.fin_request_merge(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if target is null or target = me then
    raise exception 'invalid target';
  end if;
  if not exists (select 1 from public.fin_profiles p where p.id = target and p.site_user) then
    raise exception 'target not found';
  end if;
  if exists (
    select 1 from public.fin_merge_requests m
    where m.status = 'accepted'
      and (m.requester_id in (me, target) or m.target_id in (me, target))
  ) then
    raise exception 'already merged';
  end if;
  if exists (
    select 1 from public.fin_merge_requests m
    where m.status = 'pending'
      and ((m.requester_id = me and m.target_id = target)
        or (m.requester_id = target and m.target_id = me))
  ) then
    raise exception 'request already open';
  end if;
  if (select count(*) from public.fin_merge_requests m
      where m.requester_id = me and m.status = 'pending') >= 5 then
    raise exception 'too many pending requests';
  end if;

  insert into public.fin_merge_requests (requester_id, target_id)
  values (me, target)
  returning id into new_id;

  return new_id;
end;
$$;


-- ------------------------------------------------------------
-- 6) Accept or reject (target user only)
-- ------------------------------------------------------------
create or replace function public.fin_respond_merge(req uuid, accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.fin_merge_requests%rowtype;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  select * into r from public.fin_merge_requests where id = req for update;
  if not found or r.target_id <> me or r.status <> 'pending' then
    raise exception 'request not available';
  end if;

  if accept then
    if exists (
      select 1 from public.fin_merge_requests m
      where m.status = 'accepted'
        and m.id <> r.id
        and (m.requester_id in (r.requester_id, r.target_id)
          or m.target_id in (r.requester_id, r.target_id))
    ) then
      raise exception 'already merged';
    end if;
    update public.fin_merge_requests
       set status = 'accepted', responded_at = now()
     where id = r.id;
    return 'accepted';
  end if;

  update public.fin_merge_requests
     set status = 'rejected', responded_at = now()
   where id = r.id;
  return 'rejected';
end;
$$;


-- ------------------------------------------------------------
-- 7) Cancel a pending request (requester) / end a merge (either user)
-- ------------------------------------------------------------
create or replace function public.fin_cancel_merge(req uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fin_merge_requests
     set status = 'cancelled', responded_at = now()
   where id = req
     and requester_id = auth.uid()
     and status = 'pending';
  if not found then
    raise exception 'request not available';
  end if;
end;
$$;

create or replace function public.fin_end_merge(req uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fin_merge_requests
     set status = 'ended', responded_at = now()
   where id = req
     and status = 'accepted'
     and auth.uid() in (requester_id, target_id);
  if not found then
    raise exception 'merge not available';
  end if;
end;
$$;


-- ------------------------------------------------------------
-- 8) My requests with the partner's name (for the inbox page)
-- ------------------------------------------------------------
create or replace function public.fin_my_merges()
returns table (
  id uuid,
  status text,
  direction text,
  created_at timestamptz,
  responded_at timestamptz,
  partner_id uuid,
  partner_name text,
  partner_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.status,
    case when m.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
    m.created_at,
    m.responded_at,
    o.id,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)),
    (case
       when position('@' in u.email) > 3
         then substr(u.email, 1, 2) || '***' || substr(u.email, position('@' in u.email))
       else '***' || substr(u.email, position('@' in u.email))
     end)::text
  from public.fin_merge_requests m
  join lateral (
    select case when m.requester_id = auth.uid() then m.target_id else m.requester_id end as id
  ) o on true
  join auth.users u on u.id = o.id
  left join public.fin_profiles p on p.id = o.id
  where auth.uid() in (m.requester_id, m.target_id)
    and (
      m.status in ('pending', 'accepted')
      or (m.status = 'rejected' and m.requester_id = auth.uid()
          and m.responded_at > now() - interval '30 days')
    )
  order by m.created_at desc;
$$;


-- ------------------------------------------------------------
-- 9) Grants: functions are callable only by signed-in users
-- ------------------------------------------------------------
revoke all on function public.fin_is_merged_with(uuid)       from public, anon;
revoke all on function public.fin_find_users(text)           from public, anon;
revoke all on function public.fin_request_merge(uuid)        from public, anon;
revoke all on function public.fin_respond_merge(uuid, boolean) from public, anon;
revoke all on function public.fin_cancel_merge(uuid)         from public, anon;
revoke all on function public.fin_end_merge(uuid)            from public, anon;
revoke all on function public.fin_my_merges()                from public, anon;

grant execute on function public.fin_is_merged_with(uuid)       to authenticated;
grant execute on function public.fin_find_users(text)           to authenticated;
grant execute on function public.fin_request_merge(uuid)        to authenticated;
grant execute on function public.fin_respond_merge(uuid, boolean) to authenticated;
grant execute on function public.fin_cancel_merge(uuid)         to authenticated;
grant execute on function public.fin_end_merge(uuid)            to authenticated;
grant execute on function public.fin_my_merges()                to authenticated;

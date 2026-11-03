-- Run once in Supabase > SQL Editor.
-- Auth > Providers > Email: keep "Confirm email" ON. Auth > URL Configuration: add your GitHub Pages URL to Redirect URLs.
create table if not exists public.profiles(
  id uuid primary key references auth.users on delete cascade,
  email text,
  coins numeric(30,10) not null default 0,
  last_amount numeric(30,10) not null default 0,
  spins int not null default 0,
  diamonds int not null default 0,
  pending_diamonds int not null default 0,
  next_drop int not null default (10+floor(random()*11))::int,
  role text not null default 'user' check (role in ('user','admin')),
  banned boolean not null default false,
  created_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create or replace function public.is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and not banned) $$;

drop policy if exists p_select on public.profiles;
drop policy if exists p_admin_update on public.profiles;
drop policy if exists p_admin_delete on public.profiles;
create policy p_select on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy p_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy p_admin_delete on public.profiles for delete to authenticated using (public.is_admin());
-- no insert policy and no user update policy: users change data only through the functions below.

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into public.profiles(id,email) values(new.id,new.email) on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.spin() returns public.profiles language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.banned then raise exception 'denied'; end if;
  p.last_amount := case when p.spins=0 then 0.0001 else round(p.last_amount*1.001,10) end;
  p.coins := p.coins+p.last_amount; p.spins := p.spins+1;
  if p.spins>=p.next_drop then
    p.pending_diamonds := p.pending_diamonds+1;
    p.next_drop := p.spins+10+floor(random()*11)::int;
  end if;
  update public.profiles set coins=p.coins,last_amount=p.last_amount,spins=p.spins,pending_diamonds=p.pending_diamonds,next_drop=p.next_drop where id=p.id;
  return p;
end $$;

create or replace function public.collect_diamond() returns public.profiles language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.banned then raise exception 'denied'; end if;
  if p.pending_diamonds>0 then
    update public.profiles set pending_diamonds=pending_diamonds-1,diamonds=diamonds+1 where id=p.id returning * into p;
  end if;
  return p;
end $$;

revoke all on function public.spin(),public.collect_diamond() from public,anon;
grant execute on function public.spin(),public.collect_diamond() to authenticated;
-- make yourself admin (after you sign up):
-- update public.profiles set role='admin' where email='YOUR_EMAIL';

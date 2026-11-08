-- ============================================================
-- Expense and installments site: schema + Row Level Security
-- Run this file ONCE in Supabase SQL Editor.
-- Safe for a project shared with another site:
--   all objects are prefixed with fin_
--   nothing that belongs to another site is changed
-- ============================================================


-- ------------------------------------------------------------
-- 1) fin_profiles: one row per user (display name)
-- ------------------------------------------------------------
create table if not exists public.fin_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.fin_profiles enable row level security;
alter table public.fin_profiles force row level security;

drop policy if exists "fin_profiles_select_own" on public.fin_profiles;
drop policy if exists "fin_profiles_insert_own" on public.fin_profiles;
drop policy if exists "fin_profiles_update_own" on public.fin_profiles;
drop policy if exists "fin_profiles_delete_own" on public.fin_profiles;

create policy "fin_profiles_select_own" on public.fin_profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "fin_profiles_insert_own" on public.fin_profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "fin_profiles_update_own" on public.fin_profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "fin_profiles_delete_own" on public.fin_profiles
  for delete to authenticated
  using ((select auth.uid()) = id);


-- ------------------------------------------------------------
-- 2) fin_entries: every income or debt occurrence.
--    Recurring items are expanded into one row per occurrence
--    and share the same series_id.
--    amount is in million toman.
--    due_date is the Gregorian date used for queries.
-- ------------------------------------------------------------
create table if not exists public.fin_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('income', 'debt')),
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  amount        numeric(14, 3) not null check (amount > 0 and amount < 1000000000),
  due_date      date not null,
  jalali_year   smallint not null check (jalali_year between 1300 and 1700),
  jalali_month  smallint not null check (jalali_month between 1 and 12),
  jalali_day    smallint not null check (jalali_day between 1 and 31),
  is_recurring  boolean not null default false,
  recur_unit    text check (recur_unit in ('monthly', 'yearly')),
  recur_total   smallint check (recur_total between 1 and 120),
  series_id     uuid,
  series_index  smallint not null default 0,
  created_at    timestamptz not null default now(),
  constraint fin_entries_recur_consistency check (
    (is_recurring = false and recur_unit is null and recur_total is null)
    or (is_recurring = true and recur_unit is not null and recur_total is not null)
  )
);

create index if not exists fin_entries_user_due_idx
  on public.fin_entries (user_id, due_date);

create index if not exists fin_entries_user_kind_due_idx
  on public.fin_entries (user_id, kind, due_date);

create index if not exists fin_entries_user_series_idx
  on public.fin_entries (user_id, series_id)
  where series_id is not null;

alter table public.fin_entries enable row level security;
alter table public.fin_entries force row level security;

drop policy if exists "fin_entries_select_own" on public.fin_entries;
drop policy if exists "fin_entries_insert_own" on public.fin_entries;
drop policy if exists "fin_entries_update_own" on public.fin_entries;
drop policy if exists "fin_entries_delete_own" on public.fin_entries;

create policy "fin_entries_select_own" on public.fin_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "fin_entries_insert_own" on public.fin_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "fin_entries_update_own" on public.fin_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "fin_entries_delete_own" on public.fin_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 3) Grants: anonymous visitors cannot touch these two tables.
--    Only these tables are affected.
-- ------------------------------------------------------------
revoke all on public.fin_profiles from anon;
revoke all on public.fin_entries  from anon;
grant select, insert, update, delete on public.fin_profiles to authenticated;
grant select, insert, update, delete on public.fin_entries  to authenticated;


-- ------------------------------------------------------------
-- 4) Triggers (unique names with the fin_ prefix)
-- ------------------------------------------------------------
create or replace function public.fin_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fin_profiles_touch_updated_at on public.fin_profiles;
create trigger fin_profiles_touch_updated_at
  before update on public.fin_profiles
  for each row execute function public.fin_touch_updated_at();

-- Creates a display-name row for every new user.
-- It also runs for sign-ups of the other site, so every error
-- is swallowed: it can never break anybody's sign-up.
create or replace function public.fin_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.fin_profiles (id, full_name)
    values (new.id, nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
    on conflict (id) do nothing;
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists fin_on_auth_user_created on auth.users;
create trigger fin_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fin_handle_new_user();


-- ------------------------------------------------------------
-- 5) Auth settings (done in the dashboard, not SQL)
--    Authentication > Providers > Email: turn on "Confirm email"
--    Authentication > URL Configuration > Redirect URLs: add
--      https://USERNAME.github.io/REPO/html/verified.html
--      https://USERNAME.github.io/REPO/html/reset-password.html
--    Do not change the existing Site URL of the other site.
-- ------------------------------------------------------------

-- ============================================================
-- Removes ONLY the objects of the expense site (prefix fin_).
-- Warning: all saved incomes and debts are deleted.
-- ============================================================

drop trigger if exists fin_on_auth_user_created on auth.users;
drop function if exists public.fin_handle_new_user();
drop function if exists public.fin_touch_updated_at();

drop table if exists public.fin_entries;
drop table if exists public.fin_profiles;

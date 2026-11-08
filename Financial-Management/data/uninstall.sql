-- ============================================================
-- Removes ONLY the objects of the expense site (prefix fin_).
-- Warning: all saved incomes, debts and merges are deleted.
-- ============================================================

drop trigger if exists fin_on_auth_user_created on auth.users;

drop policy if exists "fin_entries_select_merged" on public.fin_entries;

drop function if exists public.fin_my_merges();
drop function if exists public.fin_end_merge(uuid);
drop function if exists public.fin_cancel_merge(uuid);
drop function if exists public.fin_respond_merge(uuid, boolean);
drop function if exists public.fin_request_merge(uuid);
drop function if exists public.fin_find_users(text);
drop function if exists public.fin_is_merged_with(uuid);

drop table if exists public.fin_merge_requests;
drop table if exists public.fin_entries;
drop table if exists public.fin_profiles;

drop function if exists public.fin_handle_new_user();
drop function if exists public.fin_touch_updated_at();

-- ============================================================
-- Optional: list what already exists in the shared project.
-- Read-only, changes nothing.
-- ============================================================

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select tgname as trigger_name
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;

select proname as function_name
from pg_proc
where pronamespace = 'public'::regnamespace
order by proname;

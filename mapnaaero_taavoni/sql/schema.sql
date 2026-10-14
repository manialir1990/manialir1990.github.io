create table members(national_id text primary key,user_id uuid unique references auth.users on delete set null,first_name text,last_name text,mobile text,email text,parent_company text,status text default 'فعال',coop int,score numeric default 0,role text default 'member');
create table payments(id bigserial primary key,national_id text references members on delete cascade,amount numeric,paid_at text);
create table obligations(id bigserial primary key,national_id text references members on delete cascade,amount numeric,due_at text);
create table excel_config(key text primary key,value jsonb);
create table requests(id bigserial primary key,national_id text,full_name text,body text,created_at timestamptz default now());
create function is_admin() returns bool language sql security definer stable as $$select exists(select 1 from members where user_id=auth.uid() and role in('admin','superadmin'))$$;
create function is_super() returns bool language sql security definer stable as $$select exists(select 1 from members where user_id=auth.uid() and role='superadmin')$$;
create function leaderboard() returns table(id text,first_name text,last_name text,score numeric) language sql security definer as $$select md5(national_id),first_name,last_name,score from members where status<>'انصرافی اولیه' order by score desc$$;
create function my_hash() returns text language sql security definer as $$select md5(national_id) from members where user_id=auth.uid()$$;
create function guard() returns trigger language plpgsql security definer as $$begin
if not is_admin() then new.national_id:=old.national_id;new.user_id:=old.user_id;new.role:=old.role;new.score:=old.score;new.status:=old.status;new.coop:=old.coop;new.first_name:=old.first_name;new.last_name:=old.last_name;new.mobile:=old.mobile;new.parent_company:=old.parent_company;
elsif not is_super() then new.role:=old.role;end if;return new;end$$;
create trigger g before update on members for each row execute function guard();
alter table members enable row level security;alter table payments enable row level security;alter table obligations enable row level security;alter table excel_config enable row level security;alter table requests enable row level security;
create policy m_sel on members for select using(user_id=auth.uid() or is_admin());
create policy m_upd on members for update using(user_id=auth.uid() or is_admin());
create policy m_ins on members for insert with check(is_admin());
create policy m_del on members for delete using(is_super());
create policy p_sel on payments for select using(is_admin() or national_id=(select national_id from members where user_id=auth.uid()));
create policy p_adm on payments for all using(is_admin()) with check(is_admin());
create policy o_sel on obligations for select using(is_admin() or national_id=(select national_id from members where user_id=auth.uid()));
create policy o_adm on obligations for all using(is_admin()) with check(is_admin());
create policy c_all on excel_config for all using(is_admin()) with check(is_admin());
create policy r_ins on requests for insert with check(auth.uid() is not null);
create policy r_sel on requests for select using(is_admin());
-- Auth settings: disable "Confirm email".

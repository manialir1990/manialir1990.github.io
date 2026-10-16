create table if not exists members(national_id text primary key,user_id uuid unique references auth.users on delete set null,first_name text,last_name text,mobile text,email text,parent_company text,status text default 'فعال',coop int,score numeric default 0,role text default 'member');
create table if not exists payments(id bigserial primary key,national_id text references members on delete cascade,amount numeric,paid_at text);
create table if not exists obligations(id bigserial primary key,national_id text references members on delete cascade,amount numeric,due_at text);
create table if not exists excel_config(key text primary key,value jsonb);
create table if not exists requests(id bigserial primary key,national_id text,full_name text,body text,created_at timestamptz default now());
create or replace function is_admin() returns bool language sql security definer stable as $$select exists(select 1 from members where user_id=auth.uid() and role in('admin','superadmin'))$$;
create or replace function is_super() returns bool language sql security definer stable as $$select exists(select 1 from members where user_id=auth.uid() and role='superadmin')$$;
create or replace function leaderboard() returns table(id text,first_name text,last_name text,score numeric) language sql security definer as $$select md5(national_id),first_name,last_name,score from members where status<>'انصرافی اولیه' order by score desc$$;
create or replace function my_hash() returns text language sql security definer as $$select md5(national_id) from members where user_id=auth.uid()$$;
create or replace function guard() returns trigger language plpgsql security definer as $$begin
if not is_admin() then new.national_id:=old.national_id;new.user_id:=old.user_id;new.role:=old.role;new.score:=old.score;new.status:=old.status;new.coop:=old.coop;new.first_name:=old.first_name;new.last_name:=old.last_name;new.mobile:=old.mobile;new.parent_company:=old.parent_company;
elsif not is_super() then new.role:=old.role;end if;return new;end$$;
drop trigger if exists g on members;
create trigger g before update on members for each row execute function guard();
alter table members enable row level security;alter table payments enable row level security;alter table obligations enable row level security;alter table excel_config enable row level security;alter table requests enable row level security;
drop policy if exists m_sel on members;
create policy m_sel on members for select using(user_id=auth.uid() or is_admin());
drop policy if exists m_upd on members;
create policy m_upd on members for update using(user_id=auth.uid() or is_admin());
drop policy if exists m_ins on members;
create policy m_ins on members for insert with check(is_admin());
drop policy if exists m_del on members;
create policy m_del on members for delete using(is_super());
drop policy if exists p_sel on payments;
create policy p_sel on payments for select using(is_admin() or national_id=(select national_id from members where user_id=auth.uid()));
drop policy if exists p_adm on payments;
create policy p_adm on payments for all using(is_admin()) with check(is_admin());
drop policy if exists o_sel on obligations;
create policy o_sel on obligations for select using(is_admin() or national_id=(select national_id from members where user_id=auth.uid()));
drop policy if exists o_adm on obligations;
create policy o_adm on obligations for all using(is_admin()) with check(is_admin());
drop policy if exists c_all on excel_config;
create policy c_all on excel_config for all using(is_admin()) with check(is_admin());
drop policy if exists r_ins on requests;
create policy r_ins on requests for insert with check(auth.uid() is not null);
drop policy if exists r_sel on requests;
create policy r_sel on requests for select using(is_admin());
-- Auth settings: disable "Confirm email".

create table if not exists documents(id bigserial primary key,kind text check(kind in('invitations','minutes')),title text,path text,created_at timestamptz default now());
alter table documents enable row level security;
drop policy if exists d_sel on documents;
create policy d_sel on documents for select using(auth.uid() is not null);
drop policy if exists d_adm on documents;
create policy d_adm on documents for all using(is_admin()) with check(is_admin());
insert into storage.buckets(id,name,public) values('docs','docs',true) on conflict do nothing;
drop policy if exists docs_read on storage.objects;
create policy docs_read on storage.objects for select using(bucket_id='docs');
drop policy if exists docs_ins on storage.objects;
create policy docs_ins on storage.objects for insert with check(bucket_id='docs' and is_admin());
drop policy if exists docs_del on storage.objects;
create policy docs_del on storage.objects for delete using(bucket_id='docs' and is_admin());

create table if not exists settings(key text primary key,value text);
alter table settings enable row level security;
drop policy if exists st_all on settings;
create policy st_all on settings for all using(is_admin()) with check(is_admin());
create table if not exists pending_members(id bigserial primary key,national_id text unique,first_name text,last_name text,mobile text,email text,code text,user_id uuid references auth.users on delete cascade,created_at timestamptz default now());
alter table pending_members enable row level security;
drop policy if exists pm_all on pending_members;
create policy pm_all on pending_members for all using(is_admin()) with check(is_admin());
create table if not exists reset_codes(national_id text primary key,code_hash text,expires_at timestamptz,tries int default 0);
alter table reset_codes enable row level security;
create or replace function submit_signup(nid text,fn text,ln text,mob text,mail text,code text) returns text language plpgsql security definer as $$
declare uid uuid:=auth.uid(); pu uuid;
begin
 if uid is null or not exists(select 1 from auth.users u where u.id=uid and u.email like nid||'@%') then return 'auth'; end if;
 if nid !~ '^\d{10}$' or mob !~ '^09\d{9}$' or mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or coalesce(fn,'')='' or coalesce(ln,'')='' or coalesce(code,'')='' then return 'invalid'; end if;
 if exists(select 1 from members where national_id=nid and user_id is not null) then return 'exists'; end if;
 select user_id into pu from pending_members where national_id=nid;
 if found and pu is distinct from uid then return 'pending'; end if;
 insert into pending_members(national_id,first_name,last_name,mobile,email,code,user_id) values(nid,fn,ln,mob,mail,code,uid)
 on conflict(national_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,mobile=excluded.mobile,email=excluded.email,code=excluded.code;
 return 'ok';
end$$;
grant execute on function submit_signup(text,text,text,text,text,text) to authenticated;
create or replace function approve_pending(pid bigint) returns void language plpgsql security definer as $$
declare r pending_members;
begin
 if not is_admin() then raise exception 'forbidden'; end if;
 select * into r from pending_members where id=pid;
 if not found then return; end if;
 insert into members(national_id,first_name,last_name,mobile,email,user_id) values(r.national_id,r.first_name,r.last_name,r.mobile,r.email,r.user_id)
 on conflict(national_id) do update set user_id=excluded.user_id,email=excluded.email,mobile=coalesce(members.mobile,excluded.mobile);
 delete from pending_members where id=pid;
end$$;

alter table pending_members add column if not exists code text;
drop function if exists check_initial(text,text);
drop function if exists claim(text);
drop function if exists submit_signup(text,text,text,text,text);
drop table if exists secrets;
alter table pending_members add column if not exists email text;
alter table pending_members add column if not exists user_id uuid;
create table if not exists reset_codes(national_id text primary key,code_hash text,expires_at timestamptz,attempts int default 0);
alter table reset_codes enable row level security;
create or replace function signup_state(nid text) returns text language sql security definer as $$
select case when exists(select 1 from members where national_id=nid and user_id is not null) then 'exists'
when exists(select 1 from pending_members where national_id=nid) then 'pending' else 'ok' end$$;
grant execute on function signup_state(text) to anon,authenticated;
create or replace function submit_signup(nid text,fn text,ln text,mob text,mail text,code text) returns text language plpgsql security definer as $$
declare u uuid:=auth.uid(); s text;
begin
 if u is null or not exists(select 1 from auth.users x where x.id=u and x.email like nid||'@%') then return 'invalid'; end if;
 if nid !~ '^\d{10}$' or mob !~ '^09\d{9}$' or mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or coalesce(fn,'')='' or coalesce(ln,'')='' or coalesce(code,'')='' then return 'invalid'; end if;
 s:=signup_state(nid); if s<>'ok' then return s; end if;
 insert into pending_members(national_id,first_name,last_name,mobile,email,code,user_id) values(nid,fn,ln,mob,mail,code,u);
 return 'ok';
end$$;
grant execute on function submit_signup(text,text,text,text,text,text) to authenticated;
create or replace function approve_pending(pid bigint) returns void language plpgsql security definer as $$
declare r pending_members;
begin
 if not is_admin() then raise exception 'forbidden'; end if;
 select * into r from pending_members where id=pid;
 if not found then return; end if;
 if exists(select 1 from members where national_id=r.national_id) then
  update members set user_id=r.user_id,email=r.email where national_id=r.national_id;
 else
  insert into members(national_id,first_name,last_name,mobile,email,user_id) values(r.national_id,r.first_name,r.last_name,r.mobile,r.email,r.user_id);
 end if;
 delete from pending_members where id=pid;
end$$;
-- superadmin: register on register.html, then run (replace the id):
-- insert into members(national_id,first_name,last_name,mobile,email,user_id,role) select national_id,first_name,last_name,mobile,email,user_id,'superadmin' from pending_members where national_id='0000000000';
-- delete from pending_members where national_id='0000000000';
notify pgrst,'reload schema';
alter table members add column if not exists created_at timestamptz default now();
alter table payments add column if not exists created_at timestamptz default now();
alter table obligations add column if not exists created_at timestamptz default now();
notify pgrst,'reload schema';

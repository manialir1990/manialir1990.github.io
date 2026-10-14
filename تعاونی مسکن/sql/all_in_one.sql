create table if not exists members(national_id text primary key,user_id uuid unique references auth.users on delete set null,first_name text,last_name text,mobile text,email text,parent_company text,status text default 'فعال',coop int,score numeric default 0,role text default 'member');
create table if not exists secrets(national_id text primary key references members on delete cascade,init_pw text);
create table if not exists payments(id bigserial primary key,national_id text references members on delete cascade,amount numeric,paid_at text);
create table if not exists obligations(id bigserial primary key,national_id text references members on delete cascade,amount numeric,due_at text);
create table if not exists excel_config(key text primary key,value jsonb);
create table if not exists requests(id bigserial primary key,national_id text,full_name text,body text,created_at timestamptz default now());
create or replace function is_admin() returns bool language sql security definer stable as $$select exists(select 1 from members where user_id=auth.uid() and role in('admin','superadmin'))$$;
create or replace function is_super() returns bool language sql security definer stable as $$select exists(select 1 from members where user_id=auth.uid() and role='superadmin')$$;
create or replace function check_initial(nid text,pw text) returns bool language sql security definer as $$select exists(select 1 from secrets s join members m using(national_id) where s.national_id=nid and s.init_pw=pw and m.user_id is null)$$;
create or replace function claim(nid text) returns void language sql security definer as $$
update members set user_id=auth.uid() where national_id=nid and user_id is null
and exists(select 1 from auth.users u where u.id=auth.uid() and u.email like nid||'@%')$$;
create or replace function leaderboard() returns table(id text,first_name text,last_name text,score numeric) language sql security definer as $$select md5(national_id),first_name,last_name,score from members where status<>'انصرافی اولیه' order by score desc$$;
create or replace function my_hash() returns text language sql security definer as $$select md5(national_id) from members where user_id=auth.uid()$$;
create or replace function guard() returns trigger language plpgsql security definer as $$begin
if not is_admin() then new.national_id:=old.national_id;new.user_id:=old.user_id;new.role:=old.role;new.score:=old.score;new.status:=old.status;new.coop:=old.coop;new.first_name:=old.first_name;new.last_name:=old.last_name;new.mobile:=old.mobile;new.parent_company:=old.parent_company;
elsif not is_super() then new.role:=old.role;end if;return new;end$$;
drop trigger if exists g on members;
create trigger g before update on members for each row execute function guard();
alter table members enable row level security;alter table secrets enable row level security;alter table payments enable row level security;alter table obligations enable row level security;alter table excel_config enable row level security;alter table requests enable row level security;
drop policy if exists m_sel on members;
create policy m_sel on members for select using(user_id=auth.uid() or is_admin());
drop policy if exists m_upd on members;
create policy m_upd on members for update using(user_id=auth.uid() or is_admin());
drop policy if exists m_ins on members;
create policy m_ins on members for insert with check(is_admin());
drop policy if exists m_del on members;
create policy m_del on members for delete using(is_super());
drop policy if exists s_all on secrets;
create policy s_all on secrets for all using(is_admin()) with check(is_admin());
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
-- superadmin: after that member's first login run: update members set role='superadmin' where national_id='YOUR_ID';
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
create table if not exists pending_members(id bigserial primary key,national_id text unique,first_name text,last_name text,mobile text,code text,created_at timestamptz default now());
alter table pending_members enable row level security;
drop policy if exists pm_all on pending_members;
create policy pm_all on pending_members for all using(is_admin()) with check(is_admin());
create or replace function submit_signup(nid text,fn text,ln text,mob text,code text) returns text language plpgsql security definer as $$
begin
 if nid !~ '^\d{10}$' or mob !~ '^09\d{9}$' or coalesce(fn,'')='' or coalesce(ln,'')='' or coalesce(code,'')='' then return 'invalid'; end if;
 if exists(select 1 from members where national_id=nid) then return 'exists'; end if;
 if exists(select 1 from pending_members where national_id=nid) then return 'pending'; end if;
 insert into pending_members(national_id,first_name,last_name,mobile,code) values(nid,fn,ln,mob,code);
 return 'ok';
end$$;
grant execute on function submit_signup(text,text,text,text,text) to anon,authenticated;
create or replace function approve_pending(pid bigint) returns void language plpgsql security definer as $$
declare r pending_members;
begin
 if not is_admin() then raise exception 'forbidden'; end if;
 select * into r from pending_members where id=pid;
 if not found then return; end if;
 insert into members(national_id,first_name,last_name,mobile) values(r.national_id,r.first_name,r.last_name,r.mobile);
 insert into secrets(national_id,init_pw) values(r.national_id,right((r.mobile::numeric*2)::text,5));
 delete from pending_members where id=pid;
end$$;

alter table pending_members add column if not exists code text;
-- superadmin (replace values):
-- with m as (insert into members(national_id,first_name,last_name,mobile,role) values('0000000000','نام','نام_خانوادگی','09xxxxxxxxx','superadmin') on conflict(national_id) do update set role='superadmin' returning national_id) insert into secrets(national_id,init_pw) select national_id,'رمز_اولیه' from m on conflict(national_id) do update set init_pw=excluded.init_pw;
notify pgrst,'reload schema';

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

create table if not exists settings(key text primary key,value text);
alter table settings enable row level security;
create policy st_all on settings for all using(is_admin()) with check(is_admin());
create table pending_members(id bigserial primary key,national_id text unique,first_name text,last_name text,mobile text,email text,code text,user_id uuid references auth.users on delete cascade,created_at timestamptz default now());
alter table pending_members enable row level security;
create policy pm_all on pending_members for all using(is_admin()) with check(is_admin());
create table if not exists reset_codes(national_id text primary key,code_hash text,expires_at timestamptz,tries int default 0);
alter table reset_codes enable row level security;
create function submit_signup(nid text,fn text,ln text,mob text,mail text,code text) returns text language plpgsql security definer as $$
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
create function approve_pending(pid bigint) returns void language plpgsql security definer as $$
declare r pending_members;
begin
 if not is_admin() then raise exception 'forbidden'; end if;
 select * into r from pending_members where id=pid;
 if not found then return; end if;
 insert into members(national_id,first_name,last_name,mobile,email,user_id) values(r.national_id,r.first_name,r.last_name,r.mobile,r.email,r.user_id)
 on conflict(national_id) do update set user_id=excluded.user_id,email=excluded.email,mobile=coalesce(members.mobile,excluded.mobile);
 delete from pending_members where id=pid;
end$$;

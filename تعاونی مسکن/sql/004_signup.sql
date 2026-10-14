create table settings(key text primary key,value text);
alter table settings enable row level security;
create policy st_all on settings for all using(is_admin()) with check(is_admin());
create table pending_members(id bigserial primary key,national_id text unique,first_name text,last_name text,mobile text,created_at timestamptz default now());
alter table pending_members enable row level security;
create policy pm_all on pending_members for all using(is_admin()) with check(is_admin());
create function submit_signup(nid text,fn text,ln text,mob text,code text) returns text language plpgsql security definer as $$
declare c text;
begin
 select value into c from settings where key='signup_code';
 if coalesce(c,'')='' or code is distinct from c then return 'bad_code'; end if;
 if nid !~ '^\d{10}$' or mob !~ '^09\d{9}$' or coalesce(fn,'')='' or coalesce(ln,'')='' then return 'invalid'; end if;
 if exists(select 1 from members where national_id=nid) then return 'exists'; end if;
 if exists(select 1 from pending_members where national_id=nid) then return 'pending'; end if;
 insert into pending_members(national_id,first_name,last_name,mobile) values(nid,fn,ln,mob);
 return 'ok';
end$$;
grant execute on function submit_signup(text,text,text,text,text) to anon,authenticated;
create function approve_pending(pid bigint) returns void language plpgsql security definer as $$
declare r pending_members;
begin
 if not is_admin() then raise exception 'forbidden'; end if;
 select * into r from pending_members where id=pid;
 if not found then return; end if;
 insert into members(national_id,first_name,last_name,mobile) values(r.national_id,r.first_name,r.last_name,r.mobile);
 insert into secrets(national_id,init_pw) values(r.national_id,right((r.mobile::numeric*2)::text,5));
 delete from pending_members where id=pid;
end$$;

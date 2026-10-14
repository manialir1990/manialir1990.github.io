alter table pending_members add column if not exists code text;
create or replace function submit_signup(nid text,fn text,ln text,mob text,code text) returns text language plpgsql security definer as $$
begin
 if nid !~ '^\d{10}$' or mob !~ '^09\d{9}$' or coalesce(fn,'')='' or coalesce(ln,'')='' or coalesce(code,'')='' then return 'invalid'; end if;
 if exists(select 1 from members where national_id=nid) then return 'exists'; end if;
 if exists(select 1 from pending_members where national_id=nid) then return 'pending'; end if;
 insert into pending_members(national_id,first_name,last_name,mobile,code) values(nid,fn,ln,mob,code);
 return 'ok';
end$$;
notify pgrst,'reload schema';

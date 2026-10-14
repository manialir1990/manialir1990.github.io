create or replace function claim(nid text) returns void language sql security definer as $$
update members set user_id=auth.uid() where national_id=nid and user_id is null
and exists(select 1 from auth.users u where u.id=auth.uid() and u.email=nid||'@mapna.local')$$;

create table documents(id bigserial primary key,kind text check(kind in('invitations','minutes')),title text,path text,created_at timestamptz default now());
alter table documents enable row level security;
create policy d_sel on documents for select using(auth.uid() is not null);
create policy d_adm on documents for all using(is_admin()) with check(is_admin());
insert into storage.buckets(id,name,public) values('docs','docs',true) on conflict do nothing;
create policy docs_read on storage.objects for select using(bucket_id='docs');
create policy docs_ins on storage.objects for insert with check(bucket_id='docs' and is_admin());
create policy docs_del on storage.objects for delete using(bucket_id='docs' and is_admin());

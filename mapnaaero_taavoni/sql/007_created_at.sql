alter table members add column if not exists created_at timestamptz default now();
alter table payments add column if not exists created_at timestamptz default now();
alter table obligations add column if not exists created_at timestamptz default now();
notify pgrst,'reload schema';

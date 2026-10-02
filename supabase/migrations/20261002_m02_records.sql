-- Supabase schema for Mẫu 02
create table if not exists public.m02_records (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique,
  status text not null default 'Mới',
  martyr_name text not null default '',
  martyr_hometown text not null default '',
  file_id text not null default '',
  rep_name text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists m02_records_martyr_name_idx on public.m02_records (martyr_name);
create index if not exists m02_records_file_id_idx on public.m02_records (file_id);
create index if not exists m02_records_updated_at_idx on public.m02_records (updated_at desc);

alter table public.m02_records enable row level security;
revoke all on public.m02_records from anon;
revoke all on public.m02_records from authenticated;
grant select, insert, update, delete on public.m02_records to service_role;

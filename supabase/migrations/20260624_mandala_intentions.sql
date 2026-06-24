-- Intenções mensais da Mandala do Mês
create table if not exists mandala_intentions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  month_key  text not null, -- 'YYYY_M'
  intention  text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, month_key)
);

alter table mandala_intentions enable row level security;

create policy "user sees own mandala_intentions"
  on mandala_intentions for all
  using (auth.uid() = user_id);

create index on mandala_intentions(user_id, month_key);

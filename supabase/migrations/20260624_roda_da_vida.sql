-- Roda da Vida: avaliação mensal de 10 áreas
create table if not exists roda_da_vida (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  month         text not null, -- formato 'YYYY-MM'
  saude         int check (saude between 1 and 10) default 5,
  financas      int check (financas between 1 and 10) default 5,
  carreira      int check (carreira between 1 and 10) default 5,
  amor          int check (amor between 1 and 10) default 5,
  familia       int check (familia between 1 and 10) default 5,
  amizades      int check (amizades between 1 and 10) default 5,
  lazer         int check (lazer between 1 and 10) default 5,
  espiritualidade int check (espiritualidade between 1 and 10) default 5,
  desenvolvimento int check (desenvolvimento between 1 and 10) default 5,
  ambiente      int check (ambiente between 1 and 10) default 5,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, month)
);

-- RLS
alter table roda_da_vida enable row level security;

create policy "user sees own roda_da_vida"
  on roda_da_vida for all
  using (auth.uid() = user_id);

-- Índice para busca por mês
create index on roda_da_vida(user_id, month);

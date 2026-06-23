-- ============================================================
-- Check-in diário, rastreamento de hábitos e perfil expandido
-- ============================================================

-- Colunas adicionais no perfil (peso, altura, intenção)
alter table profiles
  add column if not exists weight numeric(5,1),          -- kg
  add column if not exists height integer,               -- cm
  add column if not exists main_intention text;          -- intenção principal da jornada

-- Tabela de check-ins diários (manhã e noite)
create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  period text not null check (period in ('morning', 'evening')),

  -- Manhã
  energy integer check (energy between 1 and 5),
  emotion integer check (emotion between 1 and 5),
  mind integer check (mind between 1 and 5),
  sleep_quality integer check (sleep_quality between 1 and 5),
  dream_notes text,
  intention text,

  -- Noite
  alignment text,
  gratitude text,
  mood integer check (mood between 1 and 5),
  release_notes text,

  created_at timestamptz default now(),
  unique(user_id, date, period)
);

alter table daily_checkins enable row level security;

create policy "Usuária gerencia próprio check-in"
  on daily_checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabela de hábitos diários
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  habit text not null,   -- 'caminhada', 'hidratacao', 'cha_almoco', 'cha_noite', 'leitura', 'silencio'
  created_at timestamptz default now(),
  unique(user_id, date, habit)
);

alter table habit_logs enable row level security;

create policy "Usuária gerencia próprios hábitos"
  on habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Banco de gratidões (texto livre salvo por check-in noturno)
create table if not exists gratitudes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  content text not null,
  created_at timestamptz default now()
);

alter table gratitudes enable row level security;

create policy "Usuária gerencia próprias gratidões"
  on gratitudes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rollback:
-- alter table profiles drop column if exists weight, drop column if exists height, drop column if exists main_intention;
-- drop table if exists gratitudes;
-- drop table if exists habit_logs;
-- drop table if exists daily_checkins;

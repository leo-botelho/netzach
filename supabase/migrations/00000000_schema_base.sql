-- ═══════════════════════════════════════════════════════════════
-- SCHEMA BASE — o que já existia no banco antes de haver migrations
--
-- Extraído do banco de produção em 19/08/2026. Até aqui, seis tabelas
-- centrais (profiles, horoscopes, daily_insights, rituals,
-- services_catalog, service_requests) e outras quatro só existiam no
-- painel do Supabase: o repositório não conseguia recriar o banco.
--
-- Este arquivo é o retrato do estado real, com `if not exists` em tudo,
-- para poder rodar sobre um banco que já tem essas tabelas sem quebrar.
-- As correções vêm nas migrations datadas, depois desta.
--
-- ⚠️ Três problemas ficam VISÍVEIS aqui de propósito, comentados onde
-- aparecem. Não são corrigidos neste arquivo, que é um retrato do que
-- existe; a correção está em 20260819_corrige_schema_base.sql.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists vector;


-- ───────────────────────────────────────────────────────────────
-- profiles — o perfil sagrado da usuária
--
-- ⚠️ PROBLEMA 1: duas colunas apontam para auth.users. `id` é a chave
-- primária e `user_id` é o que todas as políticas usam — e `user_id`
-- aceita nulo. Uma linha com user_id nulo fica invisível para a
-- própria dona, porque `auth.uid() = user_id` nunca casa.
--
-- ⚠️ PROBLEMA 2: colunas duplicadas de origens diferentes.
-- `signo_solar` e `sign_sun` guardam a mesma coisa; `cycle_length` e
-- `cycle_duration` também. O código só usa as segundas.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid not null,
  user_id uuid,
  full_name text,
  birth_date date,
  signo_solar text,                    -- legado; o código usa sign_sun
  last_period_date date,
  cycle_length integer default 28,     -- legado; o código usa cycle_duration
  subscription_status text default 'active'::text,
  role text default 'student'::text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  birth_time time without time zone,
  birth_city text,
  sign_sun text,
  sign_moon text,
  sign_rising text,
  period_duration integer default 5,
  cycle_duration integer default 28,
  whatsapp text,
  plan_type text,
  subscription_end_date timestamptz,
  last_payment_method text,
  weight numeric(5,1),
  height integer,
  main_intention text,
  asaas_customer_id text,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

alter table public.profiles enable row level security;


-- ───────────────────────────────────────────────────────────────
-- Conteúdo publicado pela fundadora
--
-- ⚠️ PROBLEMA 3: todas estas tabelas têm leitura liberada para
-- `public`, que inclui visitante sem conta. Horóscopos, rituais,
-- cartas de tarô, arcano do dia e catálogo saem por uma requisição
-- REST sem login. É conteúdo de assinatura.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.horoscopes (
  id uuid primary key default gen_random_uuid(),
  sign text not null,
  type text not null,
  content text not null,
  valid_date date not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.horoscopes enable row level security;

create table if not exists public.daily_insights (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  moon_phase text,
  astrological_highlight text,
  recommended_bath text,
  tarot_card_id text,
  card_image_url text,
  card_meaning text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.daily_insights enable row level security;

create table if not exists public.rituals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text,
  materials text,
  instructions text,
  is_active boolean default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.rituals enable row level security;

create table if not exists public.tarot_cards (
  id serial primary key,
  name text not null,
  image_url text not null,
  meaning_upright text,
  meaning_reversed text,
  advice text
);
alter table public.tarot_cards enable row level security;

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null,
  url text not null,
  thumbnail_url text,
  category text,
  moon_phase_match text,
  is_published boolean default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.contents enable row level security;


-- ───────────────────────────────────────────────────────────────
-- Serviços avulsos
-- ───────────────────────────────────────────────────────────────
create table if not exists public.services_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric,
  image_url text,
  payment_url text,
  active boolean default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.services_catalog enable row level security;

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_type text not null,
  status text default 'pending'::text,
  user_notes text,
  admin_response text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.service_requests enable row level security;


-- ───────────────────────────────────────────────────────────────
-- Ciclo menstrual (dado sensível, §16)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.cycle_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.cycle_history enable row level security;


-- ───────────────────────────────────────────────────────────────
-- Políticas de acesso, como estavam no banco
--
-- Reproduzidas aqui para ficarem versionadas. As que precisam mudar
-- são tratadas nas migrations datadas.
-- ───────────────────────────────────────────────────────────────
do $$
begin
  -- profiles
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='policy_read_profiles') then
    create policy policy_read_profiles on public.profiles
      for select using (auth.uid() = user_id or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='policy_insert_profiles') then
    create policy policy_insert_profiles on public.profiles
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='policy_update_profiles') then
    create policy policy_update_profiles on public.profiles
      for update using (auth.uid() = user_id or public.is_admin());
  end if;

  -- Conteúdo: administração
  if not exists (select 1 from pg_policies where tablename='horoscopes' and policyname='Admin gerencia horoscopo') then
    create policy "Admin gerencia horoscopo" on public.horoscopes for all using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='daily_insights' and policyname='Admin gerencia insights') then
    create policy "Admin gerencia insights" on public.daily_insights for all using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='rituals' and policyname='Admin gerencia rituais') then
    create policy "Admin gerencia rituais" on public.rituals for all using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='services_catalog' and policyname='Admin gerencia serviços') then
    create policy "Admin gerencia serviços" on public.services_catalog for all using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='contents' and policyname='Admin gerencia conteúdo') then
    create policy "Admin gerencia conteúdo" on public.contents for all using (public.is_admin());
  end if;

  -- Dados da própria usuária
  if not exists (select 1 from pg_policies where tablename='cycle_history' and policyname='Usuária gerencia seus ciclos') then
    create policy "Usuária gerencia seus ciclos" on public.cycle_history
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='service_requests' and policyname='Usuária vê seus pedidos') then
    create policy "Usuária vê seus pedidos" on public.service_requests
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='service_requests' and policyname='Usuária cria pedidos') then
    create policy "Usuária cria pedidos" on public.service_requests
      for insert with check (auth.uid() = user_id);
  end if;
end $$;


-- rollback: não há. Este arquivo descreve o estado que já existia.

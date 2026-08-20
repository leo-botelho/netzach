-- ═══════════════════════════════════════════════════════════════
-- FASE 1 — Segurança: travas de banco
--
-- Fecha os furos C4, C6 e A6 da auditoria de 19/08/2026:
--   · a usuária conseguia zerar os próprios créditos por UPDATE direto
--   · a base de conhecimento era legível por qualquer visitante
--   · a usuária podia editar o próprio plano por UPDATE em profiles
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 1. is_admin() — quem é admin, sem recursão de RLS
--
-- security definer para que a consulta a profiles ignore a RLS da
-- própria tabela: sem isso, uma policy de profiles que chamasse esta
-- função entraria em recursão infinita.
-- ───────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;


-- ───────────────────────────────────────────────────────────────
-- 2. profiles — RLS
--
-- Verificado em 19/08/2026: a tabela JÁ tem RLS habilitada e 4
-- políticas ativas, criadas pelo painel. Elas não são descartadas
-- aqui justamente por estarem em uso — reescrevê-las às cegas
-- quebraria fluxos que hoje funcionam.
--
-- O que falta é versioná-las neste arquivo depois de conferir o
-- conteúdo de cada uma. Enquanto isso, a trava da seção 3 abaixo já
-- impede o abuso mais grave, que é a usuária editar o próprio plano.
-- ───────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;


-- ───────────────────────────────────────────────────────────────
-- 3. profiles — colunas que a usuária não pode alterar
--
-- A policy acima deixa a usuária editar o próprio perfil, o que inclui
-- plan_type e subscription_status. Sem esta trava bastaria um UPDATE
-- pelo client para virar Lilith vitalícia.
--
-- auth.uid() é nulo quando a chamada vem da service_role (edge
-- functions), que é justamente quem tem o direito de mexer nisso.
-- ───────────────────────────────────────────────────────────────
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;  -- service_role: checkout, webhook, cron
  end if;

  new.plan_type             := old.plan_type;
  new.subscription_status   := old.subscription_status;
  new.subscription_end_date := old.subscription_end_date;
  new.role                  := old.role;
  new.asaas_customer_id     := old.asaas_customer_id;
  new.last_payment_method   := old.last_payment_method;

  return new;
end $$;

drop trigger if exists protect_profile_columns_trg on public.profiles;
create trigger protect_profile_columns_trg
  before update on public.profiles
  for each row execute function public.protect_profile_columns();


-- ───────────────────────────────────────────────────────────────
-- 4. knowledge_base — deixa de ser pública
--
-- A policy anterior era `using (true)`, o que incluía visitantes
-- anônimos: o acervo inteiro saía por uma requisição REST. As edge
-- functions leem com service_role e não dependem de policy.
-- ───────────────────────────────────────────────────────────────
drop policy if exists "knowledge_base_read" on public.knowledge_base;

create policy "knowledge_base_admin_read" on public.knowledge_base
  for select using (public.is_admin());


-- ───────────────────────────────────────────────────────────────
-- 5. Créditos — leitura para a usuária, escrita só pelo servidor
--
-- `for all using (auth.uid() = user_id)` incluía UPDATE e DELETE.
-- A usuária lia o saldo e podia reescrevê-lo.
-- ───────────────────────────────────────────────────────────────
-- Nome conferido no banco em 19/08/2026: a policy foi criada pelo
-- painel com este nome, não com o do arquivo de migration.
drop policy if exists "user gerencia próprios créditos" on public.plan_credits;
drop policy if exists "plan_credits_own" on public.plan_credits;
drop policy if exists "sacerdotisa_usage_own" on public.sacerdotisa_usage;

create policy "plan_credits_select_own" on public.plan_credits
  for select using (auth.uid() = user_id);

create policy "sacerdotisa_usage_select_own" on public.sacerdotisa_usage
  for select using (auth.uid() = user_id);


-- ───────────────────────────────────────────────────────────────
-- 6. module_limits — limites por módulo e plano
--
-- Até aqui os limites viviam em lib/planLimits.ts, no navegador, onde
-- não valem nada. Passam a ser dado, para que o servidor decida.
--
-- weekly_limit nulo = ilimitado.
--
-- O documento era ambíguo sobre a frequência de lei_atracao no plano
-- Ísis (a tabela da §4 dizia 3x/semana, o cabeçalho da §6.14 dizia 2x).
-- Decisão da fundadora em 19/08/2026: são 3x/semana.
--
-- Ho'oponopono e Criança Interior saíram do produto na mesma data e
-- por isso não aparecem aqui.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.module_limits (
  module       text not null,
  plan_type    text not null,
  weekly_limit int,                      -- null = ilimitado
  primary key (module, plan_type)
);

insert into public.module_limits (module, plan_type, weekly_limit) values
  ('banho_personalizado', 'hecate', 1),
  ('banho_personalizado', 'isis',   3),
  ('banho_personalizado', 'lilith', null),
  ('florais',             'hecate', 1),
  ('florais',             'isis',   3),
  ('florais',             'lilith', null),
  ('lei_atracao',         'hecate', 1),
  ('lei_atracao',         'isis',   3),
  ('lei_atracao',         'lilith', null),
  ('relacionamento',      'hecate', 1),
  ('relacionamento',      'isis',   3),
  ('relacionamento',      'lilith', null)
on conflict (module, plan_type) do nothing;

alter table public.module_limits enable row level security;

-- A usuária precisa ler para a tela mostrar "restam 2 desta semana".
create policy "module_limits_read" on public.module_limits
  for select to authenticated using (true);


-- ───────────────────────────────────────────────────────────────
-- 7. consume_module_credit() — débito atômico no servidor
--
-- Confere o plano, confere o limite e incrementa numa única
-- transação. Chamada pela edge function (service_role) antes de gerar
-- a resposta; se a geração falhar, refund_module_credit devolve.
--
-- Retorna o saldo restante, ou -1 para ilimitado. Levanta exceção
-- quando o limite já foi atingido.
-- ───────────────────────────────────────────────────────────────
create or replace function public.consume_module_credit(
  p_user_id uuid,
  p_module  text,
  p_week_start date
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan  text;
  v_limit int;
  v_used  int;
begin
  select lower(coalesce(plan_type, 'free')) into v_plan
  from public.profiles where user_id = p_user_id;

  if v_plan is null or v_plan = 'free' then
    raise exception 'sem_plano' using errcode = 'P0001';
  end if;

  select weekly_limit into v_limit
  from public.module_limits
  where module = p_module and plan_type = v_plan;

  -- Módulo sem limite cadastrado para o plano: trata como ilimitado,
  -- que é o comportamento de getModuleLimit() hoje.
  if not found or v_limit is null then
    return -1;
  end if;

  insert into public.plan_credits (user_id, week_start, module, used)
  values (p_user_id, p_week_start, p_module, 1)
  on conflict (user_id, week_start, module) do update
    set used = plan_credits.used + 1
  returning used into v_used;

  if v_used > v_limit then
    raise exception 'limite_atingido' using errcode = 'P0002';
  end if;

  return v_limit - v_used;
end $$;

revoke all on function public.consume_module_credit(uuid, text, date) from public;
grant execute on function public.consume_module_credit(uuid, text, date) to service_role;

/**
 * Devolve o crédito quando a consulta não chegou a ser entregue.
 *
 * O débito acontece antes da chamada ao modelo, de propósito: debitar
 * depois abriria espaço para várias consultas simultâneas passarem
 * pela mesma checagem. Se a geração falhar, o crédito volta aqui.
 */
create or replace function public.refund_module_credit(
  p_user_id uuid,
  p_module  text,
  p_week_start date
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.plan_credits
     set used = greatest(0, used - 1)
   where user_id = p_user_id
     and module = p_module
     and week_start = p_week_start;
$$;

revoke all on function public.refund_module_credit(uuid, text, date) from public;
grant execute on function public.refund_module_credit(uuid, text, date) to service_role;


-- ───────────────────────────────────────────────────────────────
-- 8. search_path fixo nas funções security definer existentes
--
-- Sem search_path fixo, uma função security definer pode ser induzida
-- a resolver nomes em outro schema (lint 0011 do Supabase).
-- ───────────────────────────────────────────────────────────────
create or replace function public.increment_sacerdotisa_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.sacerdotisa_usage (user_id, date, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set count = sacerdotisa_usage.count + 1;
end $$;

revoke all on function public.increment_sacerdotisa_usage(uuid) from public;
grant execute on function public.increment_sacerdotisa_usage(uuid) to service_role;

create or replace function public.match_knowledge(
  query_embedding vector(384),
  match_count int default 5,
  filter_category text default null
)
returns table (id uuid, title text, content text, category text, similarity float)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id, title, content, category,
    1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_base
  where (filter_category is null or category = filter_category)
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_knowledge(vector, int, text) from public;
grant execute on function public.match_knowledge(vector, int, text) to service_role;


-- ───────────────────────────────────────────────────────────────
-- 9. webhook_events — idempotência do Asaas
--
-- O webhook reprocessava o mesmo evento a cada reentrega, repetindo
-- ativação e push. A chave primária é o id do evento no Asaas.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.webhook_events (
  event_id     text primary key,
  event_type   text not null,
  user_id      uuid,
  payload      jsonb,
  processed_at timestamptz default now()
);

alter table public.webhook_events enable row level security;
-- Sem policy: apenas service_role acessa.


-- rollback:
--   drop trigger if exists protect_profile_columns_trg on public.profiles;
--   drop function if exists public.protect_profile_columns();
--   drop function if exists public.consume_module_credit(uuid, text, date);
--   drop function if exists public.is_admin();
--   drop table if exists public.webhook_events;
--   drop table if exists public.module_limits;

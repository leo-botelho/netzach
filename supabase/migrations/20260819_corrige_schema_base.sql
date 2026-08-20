-- ═══════════════════════════════════════════════════════════════
-- Corrige o que o retrato do banco revelou (19/08/2026)
--
-- O schema base foi extraído do banco de produção e trouxe três
-- problemas que não estavam em nenhum arquivo do repositório, além de
-- uma tabela que o código usa e que nunca chegou a existir.
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 1. notification_preferences NÃO EXISTE em produção
--
-- A migration 20260623_notification_preferences.sql nunca foi
-- aplicada. O Perfil grava as preferências e os horários nesta tabela,
-- e as notificações agendadas a consultam: hoje as duas coisas falham
-- em silêncio, e a personalização de horário que o documento promete
-- (§10) nunca funcionou.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.notification_preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade unique,

  morning_checkin boolean default true,
  hydration       boolean default true,
  lunch_tea       boolean default false,   -- opt-in: mais intrusivo
  evening_checkin boolean default true,
  night_tea       boolean default false,   -- opt-in
  weekly_tarot    boolean default true,
  credits_renewed boolean default true,
  credits_unused  boolean default true,
  lunar_phase     boolean default true,
  monthly_retro   boolean default true,
  monthly_wheel   boolean default true,

  -- Horários escolhidos pela usuária (§10).
  morning_time    text default '07:00',
  evening_time    text default '21:00',

  updated_at      timestamptz default now()
);

alter table public.notification_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'notification_preferences' and policyname = 'user can manage own prefs'
  ) then
    create policy "user can manage own prefs" on public.notification_preferences
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.touch_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_notif_prefs_updated_at on public.notification_preferences;
create trigger trg_notif_prefs_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_notification_preferences();


-- ───────────────────────────────────────────────────────────────
-- 2. profiles.user_id aceitava nulo
--
-- Todas as políticas de acesso usam `auth.uid() = user_id`. Uma linha
-- com user_id nulo fica invisível para a própria dona: ela loga e o
-- portal se comporta como se ela não tivesse perfil.
--
-- Como `id` e `user_id` guardam o mesmo valor, o preenchimento é
-- direto. Depois disso a coluna passa a exigir valor.
-- ───────────────────────────────────────────────────────────────
update public.profiles set user_id = id where user_id is null;

alter table public.profiles alter column user_id set not null;


-- ───────────────────────────────────────────────────────────────
-- 3. A policy "Usuária vê próprio perfil" cobria escrita também
--
-- Era `for all`, o que inclui UPDATE e DELETE. Como já existem
-- policies específicas de select, insert e update, esta só ampliava o
-- que a usuária podia fazer — inclusive apagar o próprio perfil por
-- engano, e escrever em qualquer coluna.
--
-- O trigger protect_profile_columns (migration de segurança) já barra
-- as colunas de plano e papel; esta remoção fecha o resto.
-- ───────────────────────────────────────────────────────────────
drop policy if exists "Usuária vê próprio perfil" on public.profiles;


-- ───────────────────────────────────────────────────────────────
-- 4. Conteúdo de assinatura era legível sem login
--
-- As políticas de leitura eram `to public using (true)`, e `public`
-- inclui o visitante anônimo. Horóscopos, rituais, cartas de tarô, o
-- arcano do dia e o catálogo saíam por uma requisição REST sem conta.
--
-- Passam a exigir sessão. `plan_configs` fica de fora de propósito: a
-- tela de assinatura precisa mostrar os preços antes do cadastro.
-- ───────────────────────────────────────────────────────────────
drop policy if exists "Leitura pública horoscopo" on public.horoscopes;
create policy "horoscopes_leitura_assinante" on public.horoscopes
  for select to authenticated using (true);

drop policy if exists "Leitura insights" on public.daily_insights;
create policy "daily_insights_leitura_assinante" on public.daily_insights
  for select to authenticated using (true);

drop policy if exists "Leitura publica rituais" on public.rituals;
create policy "rituals_leitura_assinante" on public.rituals
  for select to authenticated using (true);

drop policy if exists "Leitura tarot" on public.tarot_cards;
create policy "tarot_cards_leitura_assinante" on public.tarot_cards
  for select to authenticated using (true);

drop policy if exists "Alunas veem conteúdo" on public.contents;
create policy "contents_leitura_assinante" on public.contents
  for select to authenticated using (true);

drop policy if exists "Leitura pública serviços" on public.services_catalog;
create policy "services_catalog_leitura_assinante" on public.services_catalog
  for select to authenticated using (true);


-- ───────────────────────────────────────────────────────────────
-- 5. service_requests não tinha como ser atualizado nem lido pela admin
--
-- O painel lista os pedidos e responde a eles, mas só havia policy de
-- select e insert para a própria usuária: a admin não enxerga nada, e
-- ninguém consegue gravar a resposta.
-- ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'service_requests' and policyname = 'service_requests_admin'
  ) then
    create policy "service_requests_admin" on public.service_requests
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────
-- 6. Remove o envio de dados sensíveis para o N8N
--
-- O gatilho `profilesUpdate` disparava a cada inserção ou atualização
-- de perfil e enviava o registro inteiro para
-- webhook.smartskillshub.com.br: data de nascimento, peso, altura e a
-- data da última menstruação, que o documento (§16) trata como dados
-- sensíveis.
--
-- Era o fluxo antigo do N8N, substituído pela edge function
-- `calculate-astral-chart`. Confirmado pela fundadora em 19/08/2026
-- que não é mais usado.
-- ───────────────────────────────────────────────────────────────
drop trigger if exists "profilesUpdate" on public.profiles;


-- rollback:
--   -- o gatilho do N8N, se algum dia for preciso de volta:
--   -- create trigger "profilesUpdate" after insert or update on public.profiles
--   --   for each row execute function supabase_functions.http_request(
--   --     'https://webhook.smartskillshub.com.br/webhook/supabase-netzach',
--   --     'POST', '{"Content-type":"application/json"}', '{}', '5000');
--   alter table public.profiles alter column user_id drop not null;
--   drop policy if exists "service_requests_admin" on public.service_requests;
--   -- as policies de leitura voltariam a `to public using (true)`

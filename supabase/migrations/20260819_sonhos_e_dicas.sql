-- ═══════════════════════════════════════════════════════════════
-- Diário de sonhos (§9) e sistema de dicas contextuais (§7)
--
-- Os dois maiores diferenciais descritos no documento e os únicos
-- módulos centrais que ainda não existiam no código.
--
-- Nada aqui inventa dado novo: o check-in já guardava `dream_notes`,
-- humor, sono e hábitos. O que faltava era o resto do registro do
-- sonho e um lugar para lembrar qual dica já foi entregue hoje.
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 1. Diário de sonhos
--
-- O campo de texto já existia. Faltavam a emoção predominante, a
-- intensidade e a correlação com o momento do ciclo e da lua, que é
-- o que permite à usuária ver em que fases sonha mais intensamente.
-- ───────────────────────────────────────────────────────────────
alter table public.daily_checkins
  add column if not exists dream_emotion   text,
  add column if not exists dream_intensity text,
  add column if not exists dream_moon_phase  text,
  add column if not exists dream_cycle_phase text;

-- Valores fechados, conforme o documento (§9).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'daily_checkins_dream_emotion_check'
  ) then
    alter table public.daily_checkins
      add constraint daily_checkins_dream_emotion_check
      check (dream_emotion is null or dream_emotion in
        ('medo', 'alegria', 'ansiedade', 'paz', 'confusao', 'tristeza', 'raiva'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'daily_checkins_dream_intensity_check'
  ) then
    alter table public.daily_checkins
      add constraint daily_checkins_dream_intensity_check
      check (dream_intensity is null or dream_intensity in
        ('leve', 'marcante', 'perturbador'));
  end if;
end $$;

-- A tela de padrões percorre os sonhos de uma usuária ao longo dos
-- meses; sem este índice seria varredura completa a cada visita.
create index if not exists daily_checkins_sonhos_idx
  on public.daily_checkins (user_id, date desc)
  where dream_notes is not null;


-- ───────────────────────────────────────────────────────────────
-- 2. Registro de dicas entregues
--
-- O documento é explícito: no máximo uma dica por dia, com
-- prioridade emocional > sono > corpo. Sem este registro não há como
-- saber se a do dia já saiu.
--
-- Guarda apenas qual gatilho disparou, nunca o conteúdo emocional que
-- o originou: dados de humor e saúde são sensíveis (§16, LGPD).
-- ───────────────────────────────────────────────────────────────
create table if not exists public.contextual_tips (
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  trigger_key text not null,          -- 'sono_ruim', 'humor_baixo', ...
  dismissed   boolean default false,  -- a usuária deu por lida
  created_at  timestamptz default now(),
  primary key (user_id, date)
);

alter table public.contextual_tips enable row level security;

create policy "contextual_tips_select_own" on public.contextual_tips
  for select using (auth.uid() = user_id);

create policy "contextual_tips_insert_own" on public.contextual_tips
  for insert with check (auth.uid() = user_id);

create policy "contextual_tips_update_own" on public.contextual_tips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- rollback:
--   drop table if exists public.contextual_tips;
--   drop index if exists daily_checkins_sonhos_idx;
--   alter table public.daily_checkins
--     drop column if exists dream_emotion,
--     drop column if exists dream_intensity,
--     drop column if exists dream_moon_phase,
--     drop column if exists dream_cycle_phase;

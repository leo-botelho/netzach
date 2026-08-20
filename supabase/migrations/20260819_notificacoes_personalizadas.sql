-- ═══════════════════════════════════════════════════════════════
-- Horários de notificação escolhidos pela usuária
--
-- O documento (§10) promete que todos os horários são personalizáveis.
-- As colunas morning_time e evening_time já existiam em
-- notification_preferences desde junho e nunca eram lidas: o disparo
-- era em horário fixo UTC, igual para todas.
--
-- A partir daqui o check-in matinal e o noturno são disparados em
-- janelas de 15 minutos, e a função escolhe quem pediu para ser
-- avisada naquele intervalo, em horário de Brasília.
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 1. Registro de envio
--
-- Com janelas de 15 minutos, um atraso ou uma reexecução do cron
-- faria a mesma usuária receber duas vezes. Esta tabela responde
-- "esta pessoa já recebeu este aviso hoje?".
-- ───────────────────────────────────────────────────────────────
create table if not exists public.notification_sends (
  user_id  uuid not null references auth.users(id) on delete cascade,
  type     text not null,
  sent_on  date not null,
  sent_at  timestamptz default now(),
  primary key (user_id, type, sent_on)
);

create index if not exists notification_sends_limpeza_idx
  on public.notification_sends (sent_on);

alter table public.notification_sends enable row level security;
-- Sem policy: apenas service_role acessa.


-- ───────────────────────────────────────────────────────────────
-- 2. Faxina do histórico
--
-- Só interessa saber o que saiu hoje. Sem isso a tabela cresce para
-- sempre, uma linha por usuária por tipo por dia.
-- ───────────────────────────────────────────────────────────────
create or replace function public.limpar_notification_sends()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.notification_sends where sent_on < current_date - 7;
$$;

revoke all on function public.limpar_notification_sends() from public;
grant execute on function public.limpar_notification_sends() to service_role;


-- rollback:
--   drop table if exists public.notification_sends;
--   drop function if exists public.limpar_notification_sends();

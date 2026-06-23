-- Cron jobs para notificações agendadas via pg_cron + pg_net
-- Executar no SQL Editor do Supabase após habilitar pg_cron e pg_net
--
-- Habilitar extensões (uma vez, como superuser):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;

-- Variáveis — substituir antes de rodar:
--   <PROJECT_REF>   → ID do projeto Supabase (ex: abcdefghijklmnop)
--   <SERVICE_KEY>   → Service role key (Settings > API)

-- ── Diárias ──────────────────────────────────────────────────

-- Check-in matinal (7h BRT = 10h UTC)
select cron.schedule(
  'netzach-morning-checkin',
  '0 10 * * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"morning_checkin"}'
  )$$
);

-- Hidratação (10h BRT = 13h UTC)
select cron.schedule(
  'netzach-hydration-1',
  '0 13 * * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"hydration"}'
  )$$
);

-- Chá pós-almoço (13h BRT = 16h UTC)
select cron.schedule(
  'netzach-lunch-tea',
  '0 16 * * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"lunch_tea"}'
  )$$
);

-- Hidratação tarde (14h BRT = 17h UTC)
select cron.schedule(
  'netzach-hydration-2',
  '0 17 * * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"hydration"}'
  )$$
);

-- Hidratação tarde 2 (16h BRT = 19h UTC)
select cron.schedule(
  'netzach-hydration-3',
  '0 19 * * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"hydration"}'
  )$$
);

-- Check-in noturno (21h BRT = 00h UTC dia seguinte)
select cron.schedule(
  'netzach-evening-checkin',
  '0 0 * * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"evening_checkin"}'
  )$$
);

-- Chá noturno (21h30 BRT = 00h30 UTC)
select cron.schedule(
  'netzach-night-tea',
  '30 0 * * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"night_tea"}'
  )$$
);

-- ── Semanais ─────────────────────────────────────────────────

-- Tarô da semana (sábado 9h BRT = 12h UTC)
select cron.schedule(
  'netzach-weekly-tarot',
  '0 12 * * 6',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"weekly_tarot"}'
  )$$
);

-- Créditos não usados (quinta 18h BRT = 21h UTC)
select cron.schedule(
  'netzach-credits-unused',
  '0 21 * * 4',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"credits_unused"}'
  )$$
);

-- Créditos renovados (sexta 8h BRT = 11h UTC)
select cron.schedule(
  'netzach-credits-renewed',
  '0 11 * * 5',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"credits_renewed"}'
  )$$
);

-- ── Mensais ──────────────────────────────────────────────────

-- Retrospectiva (dia 1 do mês, 9h BRT = 12h UTC)
select cron.schedule(
  'netzach-monthly-retro',
  '0 12 1 * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"monthly_retro"}'
  )$$
);

-- Roda da vida (dia 2 do mês, 9h BRT = 12h UTC)
select cron.schedule(
  'netzach-monthly-wheel',
  '0 12 2 * *',
  $$select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}',
    body := '{"type":"monthly_wheel"}'
  )$$
);

-- rollback: select cron.unschedule(name) para cada job acima;

-- Database Webhook: dispara calculate-astral-chart no INSERT de profiles
-- Substitui o fluxo N8N "supabase-netzach"
--
-- Executar no SQL Editor do Supabase (requer pg_net habilitado)
-- Alternativa: criar pelo painel em Database > Webhooks > Create a new hook

select
  supabase_functions.http_request(
    'https://njevwglmpmqdaezlnbdc.supabase.co/functions/v1/calculate-astral-chart',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}',
    '{}',
    '5000'
  );

-- ─── Via painel (recomendado) ────────────────────────────────────────
-- Database → Webhooks → Create a new hook:
--   Name:    netzach-astral-chart
--   Table:   profiles
--   Events:  INSERT
--   URL:     https://njevwglmpmqdaezlnbdc.supabase.co/functions/v1/calculate-astral-chart
--   Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
--            Content-Type: application/json
-- ────────────────────────────────────────────────────────────────────

-- Também disparar em UPDATE quando birth_date, birth_time ou birth_city mudar:
-- Events: UPDATE (columns: birth_date, birth_time, birth_city)

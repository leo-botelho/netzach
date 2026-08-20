-- ═══════════════════════════════════════════════════════════════
-- TODOS os agendamentos do portal, num arquivo só
--
-- Separado das migrations de tabela de propósito: agendamento depende
-- de duas extensões do banco, e uma falha aqui não pode impedir que as
-- tabelas e funções sejam criadas.
--
-- ⚠️ PRÉ-REQUISITO — faça antes de rodar:
--
--   No painel: Database → Extensions → procure e ligue:
--     · pg_cron   (os agendamentos)
--     · pg_net    (o agendador chamar as edge functions)
--
--   Sem isso o erro é: schema "cron" does not exist
--   Para conferir, rode supabase/verificar-extensoes.sql
--
-- ⚠️ SUBSTITUA antes de rodar:
--   <PROJECT_REF>     → njevwglmpmqdaezlnbdc
--   <SERVICE_KEY>     → Settings → API → service_role
--   <INTERNAL_SECRET> → o mesmo valor de:
--                       supabase secrets set INTERNAL_TASK_SECRET="..."
--
-- Horários em UTC, comentados em horário de Brasília. Os dois
-- check-ins rodam de 15 em 15 minutos porque cada assinante escolhe o
-- próprio horário (§10); a função filtra quem pediu para ser avisada
-- naquela janela.
-- ═══════════════════════════════════════════════════════════════

-- Interrompe com uma mensagem clara se as extensões faltarem, em vez
-- de deixar o erro críptico do Postgres aparecer.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'Ligue a extensão pg_cron antes: painel → Database → Extensions';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'Ligue a extensão pg_net antes: painel → Database → Extensions';
  end if;
end $$;


do $$
declare
  v_url     text := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-notifications';
  v_headers text := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>","x-internal-secret":"<INTERNAL_SECRET>"}';
  v_job     record;
begin

  -- ── Notificações ────────────────────────────────────────────
  for v_job in
    select * from (values
      -- Check-ins: a cada 15 minutos, o dia inteiro. O horário de
      -- cada assinante é conferido dentro da função.
      ('netzach-morning-checkin', '*/15 * * * *', 'morning_checkin'),
      ('netzach-evening-checkin', '*/15 * * * *', 'evening_checkin'),

      -- Horário fixo, como o documento descreve
      ('netzach-hydration-1',     '0 13 * * *',   'hydration'),        -- 10h BRT
      ('netzach-lunch-tea',       '0 16 * * *',   'lunch_tea'),        -- 13h
      ('netzach-hydration-2',     '0 17 * * *',   'hydration'),        -- 14h
      ('netzach-hydration-3',     '0 19 * * *',   'hydration'),        -- 16h
      ('netzach-night-tea',       '30 0 * * *',   'night_tea'),        -- 21h30
      ('netzach-weekly-tarot',    '0 12 * * 6',   'weekly_tarot'),     -- sábado 9h
      ('netzach-credits-unused',  '0 15 * * 0',   'credits_unused'),   -- domingo 12h
      ('netzach-credits-renewed', '0 11 * * 1',   'credits_renewed'),  -- segunda 8h
      ('netzach-monthly-retro',   '0 12 1 * *',   'monthly_retro'),    -- dia 1, 9h
      ('netzach-monthly-wheel',   '0 12 2 * *',   'monthly_wheel')     -- dia 2, 9h
    ) as t(nome, agenda, tipo)
  loop
    begin
      perform cron.unschedule(v_job.nome);
    exception when others then null;
    end;

    perform cron.schedule(
      v_job.nome,
      v_job.agenda,
      format(
        $fmt$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$fmt$,
        v_url, v_headers, json_build_object('type', v_job.tipo)::text
      )
    );
  end loop;

  -- ── Faxinas ─────────────────────────────────────────────────
  -- Rodam direto no banco, sem passar por função.
  for v_job in
    select * from (values
      ('netzach-limpar-envios',    '0 6 * * *',  'public.limpar_notification_sends()'),  -- 3h BRT
      ('netzach-limpar-conversas', '0 7 * * *',  'public.limpar_conversas_antigas()'),   -- 4h
      ('netzach-limpar-erros',     '30 7 * * *', 'public.limpar_erros_antigos()')        -- 4h30
    ) as t(nome, agenda, chamada)
  loop
    begin
      perform cron.unschedule(v_job.nome);
    exception when others then null;
    end;

    perform cron.schedule(v_job.nome, v_job.agenda, format('select %s', v_job.chamada));
  end loop;

end $$;


-- Conferir depois de rodar: devem aparecer quinze.
--   select jobname, schedule, active from cron.job
--   where jobname like 'netzach-%' order by jobname;

-- rollback:
--   select cron.unschedule(jobname) from cron.job where jobname like 'netzach-%';

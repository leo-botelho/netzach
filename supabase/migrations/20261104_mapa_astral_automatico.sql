-- ═══════════════════════════════════════════════════════════════
-- Mapa astral calculado sozinho no cadastro
--
-- O cálculo era disparado por um gatilho que chamava o N8N. Ele foi
-- removido em 19/08 (20260819_corrige_schema_base.sql) com a promessa de
-- que a edge function `calculate-astral-chart` assumiria. A promessa
-- dependia de um Database Webhook criado à mão no painel, que o
-- DEPLOY.md nunca pediu, e o modelo antigo mandava a chave de serviço
-- como Bearer, que a função recusa desde a fase de segurança. Resultado:
-- aluna nova ficava sem mapa e o cálculo só saía rodando o N8N à mão.
--
-- Este gatilho faz o papel de substituto, chamando a função com o
-- segredo interno, o mesmo caminho que os agendamentos usam.
--
-- ⚠️ PRÉ-REQUISITO: extensão pg_net ligada (Database → Extensions).
--
-- ⚠️ SUBSTITUA antes de rodar (os mesmos valores do arquivo 8, de
--    agendamentos):
--   <PROJECT_REF>     → njevwglmpmqdaezlnbdc
--   <INTERNAL_SECRET> → o valor de INTERNAL_TASK_SECRET
--
--    Não salve o arquivo com o segredo preenchido nem faça commit dele.
--
-- Se você criou à mão um Database Webhook "netzach-astral-chart" no
-- painel (Database → Webhooks), apague-o: com os dois, o cálculo roda
-- duas vezes por cadastro.
-- ═══════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'Ligue a extensão pg_net antes: painel → Database → Extensions';
  end if;
end $$;


create or replace function public.calcular_mapa_astral_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Sem data ou sem cidade não há o que calcular.
  if new.birth_date is null or coalesce(btrim(new.birth_city), '') = '' then
    return new;
  end if;

  -- Em edição de perfil o próprio app já recalcula (e mostra o resultado
  -- na hora). Aqui só interessa a primeira vez que os dados chegam: no
  -- cadastro, ou se o perfil nasceu vazio e foi preenchido depois.
  if tg_op = 'UPDATE' and old.birth_date is not null then
    return new;
  end if;

  -- A chamada é assíncrona: o pg_net envia depois que a transação
  -- confirma, então o perfil já existe quando a função for atualizá-lo.
  -- E qualquer falha aqui vira aviso, nunca erro: um problema no envio
  -- não pode impedir ninguém de se cadastrar.
  begin
    perform net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/calculate-astral-chart',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', '<INTERNAL_SECRET>'
      ),
      body := jsonb_build_object(
        'user_id', new.user_id,
        'birth_date', new.birth_date,
        'birth_time', new.birth_time,
        'birth_city', new.birth_city
      ),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'mapa astral: não consegui agendar o cálculo (%)', sqlerrm;
  end;

  return new;
end $$;

revoke all on function public.calcular_mapa_astral_no_cadastro() from public;

drop trigger if exists calcular_mapa_astral_trg on public.profiles;
create trigger calcular_mapa_astral_trg
  after insert or update of birth_date, birth_city on public.profiles
  for each row execute function public.calcular_mapa_astral_no_cadastro();


-- rollback:
--   drop trigger if exists calcular_mapa_astral_trg on public.profiles;
--   drop function if exists public.calcular_mapa_astral_no_cadastro();

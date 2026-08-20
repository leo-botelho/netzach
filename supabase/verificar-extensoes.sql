-- Diagnóstico: o que está instalado e o que falta.
-- Cole no SQL Editor e rode.

select
  nome,
  case when instalada then '✓ instalada' else '✗ FALTA' end as situacao,
  para_que
from (
  values
    ('pg_cron', exists(select 1 from pg_extension where extname = 'pg_cron'),
     'agendamentos (notificações, faxinas)'),
    ('pg_net',  exists(select 1 from pg_extension where extname = 'pg_net'),
     'o agendador chamar as edge functions'),
    ('vector',  exists(select 1 from pg_extension where extname = 'vector'),
     'busca na base de conhecimento da sacerdotisa')
) as t(nome, instalada, para_que);

-- O schema do cron existe?
select case
  when exists (select 1 from information_schema.schemata where schema_name = 'cron')
  then '✓ schema cron existe'
  else '✗ schema cron NÃO existe — é por isso que as migrations de agendamento falham'
end as schema_cron;

-- Se já houver agendamentos, aparecem aqui.
select jobname, schedule, active
from cron.job
where jobname like 'netzach-%'
order by jobname;

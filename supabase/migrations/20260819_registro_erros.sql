-- ═══════════════════════════════════════════════════════════════
-- Registro de erros da interface
--
-- Hoje, se o app quebra no celular de uma assinante, ela vê a tela de
-- "algo se desalinhou" e ninguém mais fica sabendo. O erro morre ali.
--
-- Isto é o mínimo que faz a diferença: saber que quebrou, onde, e
-- quantas vezes. Fica no próprio Supabase, em São Paulo — sem
-- transferência de dados para fora e sem custo adicional.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.error_logs (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete set null,
  mensagem   text not null,
  origem     text,                    -- componente ou tela
  rota       text,                    -- caminho onde aconteceu
  navegador  text,                    -- user agent, para reproduzir
  detalhes   text,                    -- pilha de chamadas
  created_at timestamptz default now()
);

create index if not exists error_logs_recentes_idx
  on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

-- Qualquer sessão pode registrar o próprio erro. Sem isso, o erro que
-- mais importa (o que impede a tela de carregar) seria o único que
-- nunca chegaria.
create policy "error_logs_insert" on public.error_logs
  for insert to authenticated with check (true);

-- Ler é da administração: são relatos de falha, não conteúdo dela.
create policy "error_logs_admin_read" on public.error_logs
  for select using (public.is_admin());


-- ───────────────────────────────────────────────────────────────
-- Retenção: 60 dias
--
-- Erro velho não ajuda a consertar nada, e a tabela cresceria sem fim.
-- ───────────────────────────────────────────────────────────────
create or replace function public.limpar_erros_antigos()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.error_logs where created_at < now() - interval '60 days';
$$;

revoke all on function public.limpar_erros_antigos() from public;
grant execute on function public.limpar_erros_antigos() to service_role;


-- ───────────────────────────────────────────────────────────────
-- Resumo para o painel: o que quebrou nos últimos 7 dias
-- ───────────────────────────────────────────────────────────────
create or replace view public.erros_recentes as
  select
    mensagem,
    origem,
    rota,
    count(*)                       as ocorrencias,
    count(distinct user_id)        as pessoas_afetadas,
    max(created_at)                as ultima_vez
  from public.error_logs
  where created_at > now() - interval '7 days'
  group by mensagem, origem, rota
  order by count(*) desc;


-- rollback:
--   drop view if exists public.erros_recentes;
--   drop function if exists public.limpar_erros_antigos();
--   drop table if exists public.error_logs;

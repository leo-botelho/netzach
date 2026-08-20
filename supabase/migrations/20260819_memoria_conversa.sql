-- ═══════════════════════════════════════════════════════════════
-- Memória de conversa da Sacerdotisa
--
-- Hoje cada mensagem chega ao modelo sozinha. A tela mostra o
-- histórico, o que dá a impressão de que ela lembra, mas se a usuária
-- escreve "estou ansiosa" e depois "e para dormir?", a segunda
-- pergunta chega sem contexto nenhum.
--
-- O histórico fica no servidor, não no navegador. Se viesse do
-- cliente, seria possível forjar falas da sacerdotisa e induzi-la a
-- quebrar as próprias regras.
--
-- Tabela separada de `sacerdotisa_history` de propósito: aquela é o
-- Grimório, onde ficam as respostas que a usuária escolheu guardar.
-- Esta é conversa corrente, e tem prazo de validade.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.sacerdotisa_messages (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

-- A leitura é sempre "as últimas N desta usuária".
create index if not exists sacerdotisa_messages_user_idx
  on public.sacerdotisa_messages (user_id, created_at desc);

alter table public.sacerdotisa_messages enable row level security;

-- Só leitura para a usuária: quem escreve é a edge function, com
-- service_role. Deixar o cliente inserir aqui seria o mesmo que
-- deixá-lo forjar o histórico.
create policy "sacerdotisa_messages_select_own" on public.sacerdotisa_messages
  for select using (auth.uid() = user_id);

-- Apagar a própria conversa é dela.
create policy "sacerdotisa_messages_delete_own" on public.sacerdotisa_messages
  for delete using (auth.uid() = user_id);


-- ───────────────────────────────────────────────────────────────
-- Retenção: 30 dias
--
-- Conversa é dado sensível (§16): fala de emoção, corpo e sofrimento.
-- Guardar para sempre o que serve por alguns dias não se justifica.
-- O que a usuária quer manter, ela salva no Grimório.
-- ───────────────────────────────────────────────────────────────
create or replace function public.limpar_conversas_antigas()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.sacerdotisa_messages
  where created_at < now() - interval '30 days';
$$;

revoke all on function public.limpar_conversas_antigas() from public;
grant execute on function public.limpar_conversas_antigas() to service_role;


-- ───────────────────────────────────────────────────────────────
-- Entra na exclusão de dados da usuária (§16)
-- ───────────────────────────────────────────────────────────────
create or replace function public.excluir_meus_dados()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'sem_sessao' using errcode = 'P0001';
  end if;

  delete from public.daily_checkins       where user_id = v_id;
  delete from public.habit_logs           where user_id = v_id;
  delete from public.gratitudes           where user_id = v_id;
  delete from public.roda_da_vida         where user_id = v_id;
  delete from public.sacerdotisa_history  where user_id = v_id;
  delete from public.sacerdotisa_messages where user_id = v_id;
  delete from public.sacerdotisa_usage    where user_id = v_id;
  delete from public.mandala_intentions   where user_id = v_id;
  delete from public.dream_board          where user_id = v_id;
  delete from public.plan_credits         where user_id = v_id;
  delete from public.push_subscriptions   where user_id = v_id;
  delete from public.contextual_tips      where user_id = v_id;
  delete from public.notification_sends   where user_id = v_id;
  delete from public.notification_preferences where user_id = v_id;
  delete from public.cycle_history        where user_id = v_id;
  delete from public.profiles             where user_id = v_id;
end $$;

revoke all on function public.excluir_meus_dados() from public;
grant execute on function public.excluir_meus_dados() to authenticated;



-- rollback:
--   drop function if exists public.limpar_conversas_antigas();
--   drop table if exists public.sacerdotisa_messages;

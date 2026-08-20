-- ═══════════════════════════════════════════════════════════════
-- Quadro dos Sonhos (§6.14) e direitos de dados da usuária (§16)
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 1. Quadro dos Sonhos
--
-- "Painel visual textual com sonhos por categoria, afirmações
-- associadas e lembretes periódicos" (§6.14). Faz parte do módulo de
-- Lei da Atração e não se confunde com o diário de sonhos (§9), que
-- registra o que ela sonhou dormindo.
--
-- As categorias são as dez áreas da Roda da Vida, que a usuária já
-- conhece do cadastro: o quadro passa a conversar com a roda em vez
-- de inventar uma classificação nova.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.dream_board (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  area        text not null,          -- 'saude', 'financas', ...
  dream       text not null,          -- o que ela quer atrair
  affirmation text,                   -- afirmação associada
  achieved_at date,                   -- preenchido quando acontece
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists dream_board_user_idx
  on public.dream_board (user_id, created_at desc);

alter table public.dream_board enable row level security;

create policy "dream_board_own" on public.dream_board
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_dream_board()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists touch_dream_board_trg on public.dream_board;
create trigger touch_dream_board_trg
  before update on public.dream_board
  for each row execute function public.touch_dream_board();


-- ───────────────────────────────────────────────────────────────
-- 2. Exportação dos dados da usuária (LGPD)
--
-- O documento (§16) determina que os dados de ciclo, humor, saúde e
-- emoção são dela. Direito de acesso significa poder levar tudo
-- embora num arquivo, sem depender de pedir a alguém.
--
-- security definer com search_path fixo: a função lê apenas as linhas
-- de quem a chamou, nunca de outra pessoa.
-- ───────────────────────────────────────────────────────────────
create or replace function public.exportar_meus_dados()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := auth.uid();
  v_saida jsonb;
begin
  if v_id is null then
    raise exception 'sem_sessao' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'exportado_em', now(),
    'perfil', (
      select to_jsonb(p) - 'id'
      from public.profiles p where p.user_id = v_id
    ),
    'check_ins', coalesce((
      select jsonb_agg(to_jsonb(c) - 'id' - 'user_id' order by c.date desc)
      from public.daily_checkins c where c.user_id = v_id
    ), '[]'::jsonb),
    'habitos', coalesce((
      select jsonb_agg(to_jsonb(h) - 'id' - 'user_id' order by h.date desc)
      from public.habit_logs h where h.user_id = v_id
    ), '[]'::jsonb),
    'gratidoes', coalesce((
      select jsonb_agg(to_jsonb(g) - 'id' - 'user_id' order by g.date desc)
      from public.gratitudes g where g.user_id = v_id
    ), '[]'::jsonb),
    'roda_da_vida', coalesce((
      select jsonb_agg(to_jsonb(r) - 'id' - 'user_id')
      from public.roda_da_vida r where r.user_id = v_id
    ), '[]'::jsonb),
    'grimorio', coalesce((
      select jsonb_agg(to_jsonb(s) - 'id' - 'user_id')
      from public.sacerdotisa_history s where s.user_id = v_id
    ), '[]'::jsonb),
    'intencoes_do_mes', coalesce((
      select jsonb_agg(to_jsonb(m) - 'id' - 'user_id')
      from public.mandala_intentions m where m.user_id = v_id
    ), '[]'::jsonb),
    'quadro_dos_sonhos', coalesce((
      select jsonb_agg(to_jsonb(d) - 'id' - 'user_id')
      from public.dream_board d where d.user_id = v_id
    ), '[]'::jsonb)
  ) into v_saida;

  return v_saida;
end $$;

revoke all on function public.exportar_meus_dados() from public;
grant execute on function public.exportar_meus_dados() to authenticated;


-- ───────────────────────────────────────────────────────────────
-- 3. Exclusão dos dados da usuária (LGPD)
--
-- Apaga tudo que é dela nas tabelas do portal. A conta de acesso em
-- si (auth.users) é removida pela edge function `excluir-conta`, que
-- tem permissão para isso; esta função cuida do conteúdo.
--
-- Não é reversível, e é para ser assim: direito ao esquecimento com
-- cópia guardada não é direito ao esquecimento.
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

  delete from public.daily_checkins      where user_id = v_id;
  delete from public.habit_logs          where user_id = v_id;
  delete from public.gratitudes          where user_id = v_id;
  delete from public.roda_da_vida        where user_id = v_id;
  delete from public.sacerdotisa_history where user_id = v_id;
  delete from public.sacerdotisa_usage   where user_id = v_id;
  delete from public.mandala_intentions  where user_id = v_id;
  delete from public.dream_board         where user_id = v_id;
  delete from public.plan_credits        where user_id = v_id;
  delete from public.push_subscriptions  where user_id = v_id;
  delete from public.contextual_tips     where user_id = v_id;
  delete from public.notification_sends  where user_id = v_id;
  delete from public.notification_preferences where user_id = v_id;
  delete from public.profiles            where user_id = v_id;
end $$;

revoke all on function public.excluir_meus_dados() from public;
grant execute on function public.excluir_meus_dados() to authenticated;


-- rollback:
--   drop function if exists public.excluir_meus_dados();
--   drop function if exists public.exportar_meus_dados();
--   drop trigger if exists touch_dream_board_trg on public.dream_board;
--   drop function if exists public.touch_dream_board();
--   drop table if exists public.dream_board;

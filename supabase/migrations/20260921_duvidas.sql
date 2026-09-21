-- ═══════════════════════════════════════════════════════════════
-- Caixa de dúvidas dos cursos
--
-- Com mais de 50 aulas, esperar a Raquel abrir aula por aula para
-- achar perguntas é garantir dúvida sem resposta. Isto junta num lugar
-- só as conversas que estão esperando por ela.
--
-- Depende de 20260921_cursos.sql.
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 1. "Não precisa de resposta"
--
-- Nem todo comentário é pergunta ("amei essa aula!"). A Raquel dispensa
-- a conversa da caixa; se a aluna voltar a escrever depois disso, ela
-- reaparece.
-- ───────────────────────────────────────────────────────────────
alter table public.curso_comentarios
  add column if not exists dispensada_em timestamptz;


-- ───────────────────────────────────────────────────────────────
-- 2. Aviso de resposta é mais um tipo de notificação, e desligável
--    como os outros (§10: notificações personalizáveis).
-- ───────────────────────────────────────────────────────────────
alter table public.notification_preferences
  add column if not exists course_replies boolean default true;


-- ───────────────────────────────────────────────────────────────
-- 3. As conversas que esperam a Raquel
--
-- Uma conversa (o comentário e as respostas dele) está pendente quando
-- a última mensagem publicada não é da Raquel. Isso cobre a pergunta
-- nova e também a aluna que respondeu de volta com outra dúvida.
-- Comentário aberto pela própria Raquel (um aviso) não entra.
-- ───────────────────────────────────────────────────────────────
create or replace function public.duvidas_pendentes()
returns table (
  conversa_id      uuid,
  aula_id          uuid,
  aula_titulo      text,
  curso_titulo     text,
  curso_slug       text,
  pergunta         text,
  perguntou        text,
  perguntou_em     timestamptz,
  ultima_mensagem  text,
  ultima_autora    text,
  ultima_em        timestamptz,
  mensagens        int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'so_admin' using errcode = 'P0001';
  end if;

  return query
  with conversa as (
    select
      coalesce(c.resposta_a, c.id) as raiz,
      c.id, c.texto, c.user_id, c.created_at,
      coalesce(p.role = 'admin', false) as da_raquel,
      coalesce(nullif(btrim(p.full_name), ''), 'Aluna') as nome
    from public.curso_comentarios c
    left join public.profiles p on p.user_id = c.user_id
    where c.status = 'publicado'
  ),
  ultima as (
    select distinct on (raiz) raiz, texto, nome, created_at, da_raquel
    from conversa
    order by raiz, created_at desc
  ),
  contagem as (
    select raiz, count(*)::int as n from conversa group by raiz
  )
  select
    r.id,
    r.aula_id,
    au.titulo,
    cu.titulo,
    cu.slug,
    r.texto,
    coalesce(nullif(btrim(pr.full_name), ''), 'Aluna'),
    r.created_at,
    u.texto,
    u.nome,
    u.created_at,
    ct.n
  from public.curso_comentarios r
  join ultima u   on u.raiz = r.id
  join contagem ct on ct.raiz = r.id
  join public.curso_aulas au   on au.id = r.aula_id
  join public.curso_modulos mo on mo.id = au.modulo_id
  join public.cursos cu        on cu.id = mo.curso_id
  left join public.profiles pr on pr.user_id = r.user_id
  where r.resposta_a is null
    and r.status = 'publicado'
    and coalesce(pr.role, '') <> 'admin'
    and not u.da_raquel
    and (r.dispensada_em is null or u.created_at > r.dispensada_em)
  -- A mais antiga primeiro: quem esperou mais é atendida antes.
  order by u.created_at asc;
end $$;

revoke all on function public.duvidas_pendentes() from public;
grant execute on function public.duvidas_pendentes() to authenticated;


-- rollback:
--   drop function if exists public.duvidas_pendentes();
--   alter table public.notification_preferences drop column if exists course_replies;
--   alter table public.curso_comentarios drop column if exists dispensada_em;

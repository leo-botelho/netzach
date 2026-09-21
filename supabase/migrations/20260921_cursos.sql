-- ═══════════════════════════════════════════════════════════════
-- Área de cursos
--
-- Os cursos da Hotmart (a formação Flor da Vida primeiro) passam a
-- morar dentro do Netzach: curso → módulos → aulas, com progresso por
-- aluna e comentários em cada aula.
--
-- O vídeo começa no YouTube, como não listado. Não listado não é
-- privado: quem tiver o código assiste em qualquer lugar. Por isso o
-- código do vídeo mora numa tabela à parte (curso_aula_videos) que só
-- quem tem acesso ao curso consegue ler. Título e descrição das aulas
-- ficam visíveis para toda aluna logada, e servem de vitrine.
--
-- A coluna `provedor` existe para a troca pelo Cloudflare Stream ser
-- uma mudança de dado, não de tela.
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 1. Estrutura: cursos, módulos, aulas
-- ───────────────────────────────────────────────────────────────
create table if not exists public.cursos (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo      text not null check (length(titulo) between 1 and 160),
  subtitulo   text check (length(subtitulo) <= 240),
  descricao   text check (length(descricao) <= 4000),
  capa_url    text,
  publicado   boolean not null default false,
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.curso_modulos (
  id          uuid primary key default gen_random_uuid(),
  curso_id    uuid not null references public.cursos(id) on delete cascade,
  titulo      text not null check (length(titulo) between 1 and 160),
  descricao   text check (length(descricao) <= 2000),
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists curso_modulos_curso_idx
  on public.curso_modulos (curso_id, ordem);

create table if not exists public.curso_aulas (
  id           uuid primary key default gen_random_uuid(),
  modulo_id    uuid not null references public.curso_modulos(id) on delete cascade,
  titulo       text not null check (length(titulo) between 1 and 160),
  descricao    text check (length(descricao) <= 4000),
  duracao_seg  int check (duracao_seg >= 0),
  -- Aula aberta a qualquer aluna logada, como amostra do curso.
  gratuita     boolean not null default false,
  ordem        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists curso_aulas_modulo_idx
  on public.curso_aulas (modulo_id, ordem);

-- O código do vídeo, separado da aula: é o que não pode vazar.
create table if not exists public.curso_aula_videos (
  aula_id   uuid primary key references public.curso_aulas(id) on delete cascade,
  provedor  text not null default 'youtube' check (provedor in ('youtube', 'cloudflare')),
  video_id  text not null check (video_id ~ '^[A-Za-z0-9_-]{6,64}$')
);


-- ───────────────────────────────────────────────────────────────
-- 2. Quem pode assistir
--
-- Acesso é por curso, não por plano: as alunas que vêm da Hotmart
-- compraram a formação, não uma assinatura do Netzach. `origem` guarda
-- de onde veio cada acesso, para a venda direta pelo Asaas entrar
-- depois sem mudar a tabela.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.curso_acessos (
  user_id       uuid not null references auth.users(id) on delete cascade,
  curso_id      uuid not null references public.cursos(id) on delete cascade,
  origem        text not null default 'manual' check (origem in ('manual', 'hotmart', 'asaas', 'plano')),
  concedido_em  timestamptz not null default now(),
  -- null = vitalício, que é como a Hotmart vendia.
  expira_em     timestamptz,
  primary key (user_id, curso_id)
);

create index if not exists curso_acessos_curso_idx on public.curso_acessos (curso_id);

-- security definer: consulta curso_acessos sem esbarrar na RLS dela
-- mesma, e sem dar à aluna o poder de ler os acessos das outras.
create or replace function public.tem_acesso_ao_curso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin() or exists (
    select 1 from public.curso_acessos a
    where a.curso_id = p_curso_id
      and a.user_id = auth.uid()
      and (a.expira_em is null or a.expira_em > now())
  );
$$;

revoke all on function public.tem_acesso_ao_curso(uuid) from public;
grant execute on function public.tem_acesso_ao_curso(uuid) to authenticated;

-- De qual curso é esta aula. Usada pelas políticas abaixo.
create or replace function public.curso_da_aula(p_aula_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.curso_id
  from public.curso_aulas a
  join public.curso_modulos m on m.id = a.modulo_id
  where a.id = p_aula_id;
$$;

revoke all on function public.curso_da_aula(uuid) from public;
grant execute on function public.curso_da_aula(uuid) to authenticated;

-- Pode assistir esta aula: tem o curso, ou a aula é amostra de um
-- curso publicado.
create or replace function public.pode_assistir_aula(p_aula_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.tem_acesso_ao_curso(public.curso_da_aula(p_aula_id))
      or exists (
        select 1
        from public.curso_aulas a
        join public.curso_modulos m on m.id = a.modulo_id
        join public.cursos c on c.id = m.curso_id
        where a.id = p_aula_id and a.gratuita and c.publicado
      );
$$;

revoke all on function public.pode_assistir_aula(uuid) from public;
grant execute on function public.pode_assistir_aula(uuid) to authenticated;


-- ───────────────────────────────────────────────────────────────
-- 3. Progresso e comentários
-- ───────────────────────────────────────────────────────────────
create table if not exists public.curso_progresso (
  user_id        uuid not null references auth.users(id) on delete cascade,
  aula_id        uuid not null references public.curso_aulas(id) on delete cascade,
  -- Onde parou, para o "continuar de onde parei".
  posicao_seg    int not null default 0 check (posicao_seg >= 0),
  concluida_em   timestamptz,
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, aula_id)
);

create table if not exists public.curso_comentarios (
  id          uuid primary key default gen_random_uuid(),
  aula_id     uuid not null references public.curso_aulas(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Resposta a outro comentário. Um nível só: conversa, não fórum.
  resposta_a  uuid references public.curso_comentarios(id) on delete cascade,
  texto       text not null check (length(btrim(texto)) between 1 and 2000),
  -- Publica na hora; a Raquel oculta o que não deve ficar.
  status      text not null default 'publicado' check (status in ('publicado', 'oculto')),
  created_at  timestamptz not null default now()
);

create index if not exists curso_comentarios_aula_idx
  on public.curso_comentarios (aula_id, created_at);


-- ───────────────────────────────────────────────────────────────
-- 4. Travas (RLS)
-- ───────────────────────────────────────────────────────────────
alter table public.cursos             enable row level security;
alter table public.curso_modulos      enable row level security;
alter table public.curso_aulas        enable row level security;
alter table public.curso_aula_videos  enable row level security;
alter table public.curso_acessos      enable row level security;
alter table public.curso_progresso    enable row level security;
alter table public.curso_comentarios  enable row level security;

-- Vitrine: curso publicado é visível a quem está logada. Rascunho só
-- para a admin.
create policy "cursos_ver" on public.cursos
  for select to authenticated using (publicado or public.is_admin());
create policy "cursos_admin" on public.cursos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "modulos_ver" on public.curso_modulos
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.cursos c where c.id = curso_id and c.publicado
    )
  );
create policy "modulos_admin" on public.curso_modulos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "aulas_ver" on public.curso_aulas
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.curso_modulos m
      join public.cursos c on c.id = m.curso_id
      where m.id = modulo_id and c.publicado
    )
  );
create policy "aulas_admin" on public.curso_aulas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- O código do vídeo: só quem pode assistir.
create policy "videos_ver" on public.curso_aula_videos
  for select to authenticated using (public.pode_assistir_aula(aula_id));
create policy "videos_admin" on public.curso_aula_videos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A aluna vê os próprios acessos; só a admin concede ou retira.
create policy "acessos_ver" on public.curso_acessos
  for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "acessos_admin" on public.curso_acessos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Progresso é dela, e só em aula que ela pode assistir.
create policy "progresso_proprio" on public.curso_progresso
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.pode_assistir_aula(aula_id));

-- Comentários: leitura pela função comentarios_da_aula (abaixo), que
-- entrega só o primeiro nome de quem escreveu. A política direta cobre
-- os próprios comentários e a moderação.
create policy "comentarios_ver_proprios" on public.curso_comentarios
  for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "comentarios_escrever" on public.curso_comentarios
  for insert to authenticated with check (
    auth.uid() = user_id
    and status = 'publicado'
    and public.pode_assistir_aula(aula_id)
  );
create policy "comentarios_apagar_proprio" on public.curso_comentarios
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "comentarios_moderar" on public.curso_comentarios
  for update to authenticated using (public.is_admin()) with check (public.is_admin());


-- ───────────────────────────────────────────────────────────────
-- 5. Comentários de uma aula, como a aluna os vê
--
-- As outras alunas aparecem só pelo primeiro nome. O perfil completo
-- (nome inteiro, nascimento, ciclo) continua trancado pela RLS de
-- profiles: esta função não o abre, só tira dele o que a conversa
-- precisa.
-- ───────────────────────────────────────────────────────────────
create or replace function public.comentarios_da_aula(p_aula_id uuid)
returns table (
  id          uuid,
  resposta_a  uuid,
  texto       text,
  created_at  timestamptz,
  autora      text,
  da_raquel   boolean,
  meu         boolean,
  oculto      boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.pode_assistir_aula(p_aula_id) then
    raise exception 'sem_acesso' using errcode = 'P0001';
  end if;

  return query
  select
    c.id,
    c.resposta_a,
    c.texto,
    c.created_at,
    coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'Aluna'),
    coalesce(p.role = 'admin', false),
    c.user_id = auth.uid(),
    c.status = 'oculto'
  from public.curso_comentarios c
  left join public.profiles p on p.user_id = c.user_id
  where c.aula_id = p_aula_id
    -- Oculto some para as alunas; a admin continua vendo, para poder
    -- voltar atrás.
    and (c.status = 'publicado' or public.is_admin())
  order by c.created_at;
end $$;

revoke all on function public.comentarios_da_aula(uuid) from public;
grant execute on function public.comentarios_da_aula(uuid) to authenticated;


-- ───────────────────────────────────────────────────────────────
-- 6. Conceder acesso pelo email
--
-- A Raquel sabe o email de quem comprou na Hotmart, não o id interno.
-- profiles não guarda email, então a busca é em auth.users, que só
-- uma função security definer alcança. Só admin chama.
-- ───────────────────────────────────────────────────────────────
create or replace function public.conceder_acesso_curso(
  p_email text,
  p_curso_id uuid,
  p_origem text default 'manual'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'so_admin' using errcode = 'P0001';
  end if;

  select u.id into v_user
  from auth.users u
  where lower(u.email) = lower(btrim(p_email));

  if v_user is null then
    -- Ainda não tem conta: a admin precisa convidar primeiro.
    return 'sem_conta';
  end if;

  insert into public.curso_acessos (user_id, curso_id, origem)
  values (v_user, p_curso_id, p_origem)
  on conflict (user_id, curso_id) do update
    set origem = excluded.origem, expira_em = null;

  return 'concedido';
end $$;

revoke all on function public.conceder_acesso_curso(text, uuid, text) from public;
grant execute on function public.conceder_acesso_curso(text, uuid, text) to authenticated;

-- Quem tem acesso a um curso, com email, para a lista do painel.
create or replace function public.alunas_do_curso(p_curso_id uuid)
returns table (user_id uuid, email text, nome text, origem text, concedido_em timestamptz)
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
  select a.user_id, u.email::text, p.full_name, a.origem, a.concedido_em
  from public.curso_acessos a
  join auth.users u on u.id = a.user_id
  left join public.profiles p on p.user_id = a.user_id
  where a.curso_id = p_curso_id
  order by a.concedido_em desc;
end $$;

revoke all on function public.alunas_do_curso(uuid) from public;
grant execute on function public.alunas_do_curso(uuid) to authenticated;


-- ───────────────────────────────────────────────────────────────
-- 7. updated_at do curso
-- ───────────────────────────────────────────────────────────────
create or replace function public.touch_cursos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists touch_cursos_trg on public.cursos;
create trigger touch_cursos_trg
  before update on public.cursos
  for each row execute function public.touch_cursos();


-- ───────────────────────────────────────────────────────────────
-- 8. LGPD: progresso e comentários entram na exportação e na exclusão
--
-- As duas funções são recriadas inteiras. As versões anteriores estão
-- em 20260819_quadro_sonhos_lgpd.sql (exportar) e
-- 20260819_memoria_conversa.sql (excluir); o que muda aqui são só as
-- linhas dos cursos.
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
    ), '[]'::jsonb),
    'cursos_acessos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'curso', c.titulo, 'origem', a.origem,
        'concedido_em', a.concedido_em, 'expira_em', a.expira_em))
      from public.curso_acessos a
      join public.cursos c on c.id = a.curso_id
      where a.user_id = v_id
    ), '[]'::jsonb),
    'cursos_progresso', coalesce((
      select jsonb_agg(jsonb_build_object(
        'aula', au.titulo, 'posicao_seg', pr.posicao_seg,
        'concluida_em', pr.concluida_em))
      from public.curso_progresso pr
      join public.curso_aulas au on au.id = pr.aula_id
      where pr.user_id = v_id
    ), '[]'::jsonb),
    'cursos_comentarios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'aula', au.titulo, 'texto', cm.texto,
        'status', cm.status, 'criado_em', cm.created_at)
        order by cm.created_at)
      from public.curso_comentarios cm
      join public.curso_aulas au on au.id = cm.aula_id
      where cm.user_id = v_id
    ), '[]'::jsonb)
  ) into v_saida;

  return v_saida;
end $$;

revoke all on function public.exportar_meus_dados() from public;
grant execute on function public.exportar_meus_dados() to authenticated;

-- Os acessos comprados NÃO são apagados aqui: esta função limpa o
-- conteúdo da usuária, e o registro de compra vai embora junto com a
-- conta (on delete cascade de auth.users), na edge function excluir-conta.
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
  delete from public.curso_progresso      where user_id = v_id;
  delete from public.curso_comentarios    where user_id = v_id;
  delete from public.profiles             where user_id = v_id;
end $$;

revoke all on function public.excluir_meus_dados() from public;
grant execute on function public.excluir_meus_dados() to authenticated;


-- rollback:
--   (recriar exportar_meus_dados e excluir_meus_dados das migrations de 20260819)
--   drop function if exists public.alunas_do_curso(uuid);
--   drop function if exists public.conceder_acesso_curso(text, uuid, text);
--   drop function if exists public.comentarios_da_aula(uuid);
--   drop trigger if exists touch_cursos_trg on public.cursos;
--   drop function if exists public.touch_cursos();
--   drop table if exists public.curso_comentarios;
--   drop table if exists public.curso_progresso;
--   drop function if exists public.pode_assistir_aula(uuid);
--   drop function if exists public.curso_da_aula(uuid);
--   drop function if exists public.tem_acesso_ao_curso(uuid);
--   drop table if exists public.curso_acessos;
--   drop table if exists public.curso_aula_videos;
--   drop table if exists public.curso_aulas;
--   drop table if exists public.curso_modulos;
--   drop table if exists public.cursos;

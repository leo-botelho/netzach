-- ═══════════════════════════════════════════════════════════════
-- Extrai o desenho do banco sem precisar de Docker
--
-- Como usar: cole no SQL Editor do Supabase e rode. O resultado vem
-- em linhas de texto que reproduzem as tabelas, chaves, índices,
-- políticas de acesso e gatilhos que existem hoje.
--
-- Copie o resultado inteiro e mande de volta: a partir dele dá para
-- escrever as migrations que faltam, e o banco passa a poder ser
-- recriado a partir do repositório.
--
-- Nenhum dado de usuária é lido aqui, só a estrutura.
-- ═══════════════════════════════════════════════════════════════

with

-- ── Colunas de cada tabela ─────────────────────────────────────
colunas as (
  select
    c.relname as tabela,
    string_agg(
      format('  %I %s%s%s',
        a.attname,
        format_type(a.atttypid, a.atttypmod),
        case when a.attnotnull then ' not null' else '' end,
        case when ad.adbin is not null
             then ' default ' || pg_get_expr(ad.adbin, ad.adrelid)
             else '' end
      ),
      e',\n' order by a.attnum
    ) as corpo
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid
  left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
  where n.nspname = 'public'
    and c.relkind = 'r'
    and a.attnum > 0
    and not a.attisdropped
  group by c.relname
),

-- ── Chaves, unicidade e validações ─────────────────────────────
restricoes as (
  select
    c.relname as tabela,
    string_agg(
      format('alter table public.%I add constraint %I %s;',
             c.relname, con.conname, pg_get_constraintdef(con.oid)),
      e'\n' order by con.contype desc, con.conname
    ) as sql
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
  group by c.relname
),

-- ── Índices que não vêm das chaves ─────────────────────────────
indices as (
  select
    tablename as tabela,
    string_agg(indexdef || ';', e'\n' order by indexname) as sql
  from pg_indexes
  where schemaname = 'public'
    and indexname not in (
      select conname from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
    )
  group by tablename
),

-- ── Regras de acesso (RLS) ─────────────────────────────────────
politicas as (
  select
    tablename as tabela,
    string_agg(
      format('create policy %I on public.%I for %s to %s%s%s;',
        policyname, tablename, cmd, array_to_string(roles, ', '),
        case when qual is not null then ' using (' || qual || ')' else '' end,
        case when with_check is not null then ' with check (' || with_check || ')' else '' end
      ),
      e'\n' order by policyname
    ) as sql
  from pg_policies
  where schemaname = 'public'
  group by tablename
),

-- ── Gatilhos ───────────────────────────────────────────────────
gatilhos as (
  select
    c.relname as tabela,
    string_agg(pg_get_triggerdef(t.oid) || ';', e'\n' order by t.tgname) as sql
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
  group by c.relname
)

select
  col.tabela,
  format(
    e'-- ══ %s ══\ncreate table if not exists public.%I (\n%s\n);\n\nalter table public.%I %s row level security;\n\n%s\n\n%s\n\n%s',
    col.tabela, col.tabela, col.corpo, col.tabela,
    case when c.relrowsecurity then 'enable' else 'disable' end,
    coalesce(r.sql, '-- sem chaves declaradas'),
    coalesce(p.sql, '-- SEM POLITICA DE ACESSO'),
    coalesce(g.sql, '')
  ) || coalesce(e'\n\n' || i.sql, '') as ddl
from colunas col
join pg_class c on c.relname = col.tabela
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join restricoes r on r.tabela = col.tabela
left join indices    i on i.tabela = col.tabela
left join politicas  p on p.tabela = col.tabela
left join gatilhos   g on g.tabela = col.tabela
order by col.tabela;

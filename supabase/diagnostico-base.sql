-- ═══════════════════════════════════════════════════════════════
-- Diagnóstico da base de conhecimento
--
-- A sacerdotisa descreveu propriedades de plantas sem conseguir
-- nomeá-las. Isso sugere que os trechos indexados trazem o efeito mas
-- perderam o nome — o que acontece quando um livro é cortado em
-- pedaços e o nome fica num pedaço e a descrição no seguinte.
--
-- Cole no SQL Editor e rode. São cinco perguntas.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. O tamanho da base, por categoria ───────────────────────
select
  category as categoria,
  count(*) as trechos,
  round(avg(length(content))) as tamanho_medio,
  count(*) filter (where embedding is null) as sem_embedding
from public.knowledge_base
group by category
order by count(*) desc;


-- ── 2. De onde veio cada coisa ────────────────────────────────
-- Se o livro foi ingerido em lote, aparece aqui como uma fonte só.
select
  coalesce(metadata->>'source', '(avulso)') as fonte,
  count(*) as trechos,
  min(created_at)::date as ingerido_em
from public.knowledge_base
group by 1
order by count(*) desc
limit 20;


-- ── 3. O TESTE QUE IMPORTA: os trechos nomeiam as plantas? ────
-- Procura por nomes de plantas comuns em banhos e conta em quantos
-- trechos cada um aparece. Se der tudo zero ou quase, o problema está
-- confirmado: o material tem propriedades sem nome.
with plantas(nome) as (values
  ('arruda'), ('alecrim'), ('guiné'), ('guine'), ('espada de são jorge'),
  ('manjericão'), ('manjericao'), ('sálvia'), ('salvia'), ('lavanda'),
  ('alfazema'), ('camomila'), ('erva-doce'), ('boldo'), ('louro'),
  ('eucalipto'), ('hortelã'), ('hortela'), ('melissa'), ('rosa branca'),
  ('canela'), ('cravo'), ('mirra'), ('artemísia'), ('artemisia')
)
select
  p.nome,
  count(k.id) as trechos_que_citam
from plantas p
left join public.knowledge_base k
  on lower(k.content) like '%' || p.nome || '%'
group by p.nome
having count(k.id) > 0
order by count(k.id) desc;


-- ── 4. Como os trechos começam ────────────────────────────────
-- Um trecho que começa no meio de uma frase perdeu o contexto de onde
-- veio. Se muitos começarem em minúscula, o corte está partindo o
-- material no meio das ideias.
select
  case
    when content ~ '^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]' then 'começa com maiúscula'
    else 'começa no meio de uma frase'
  end as inicio,
  count(*) as trechos,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as porcentagem
from public.knowledge_base
group by 1;


-- ── 5. Amostra: três trechos de banho, como a sacerdotisa os vê ─
select
  title as titulo,
  category as categoria,
  left(content, 500) as inicio_do_trecho
from public.knowledge_base
where category in ('banho', 'ervas')
order by random()
limit 3;

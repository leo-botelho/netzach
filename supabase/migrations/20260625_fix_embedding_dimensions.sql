-- Corrige a dimensão do embedding de 1536 (OpenAI) para 384 (gte-small)
-- Precisa dropar o índice antes de alterar o tipo da coluna

drop index if exists knowledge_base_embedding_idx;

alter table knowledge_base
  alter column embedding type vector(384);

-- Recria o índice com a dimensão correta
create index knowledge_base_embedding_idx
  on knowledge_base using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Atualiza a função match_knowledge para garantir que usa 384
create or replace function match_knowledge(
  query_embedding vector(384),
  match_count int default 5,
  filter_category text default null
)
returns table (id uuid, title text, content text, category text, similarity float)
language sql stable as $$
  select id, title, content, category,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_base
  where (filter_category is null or category = filter_category)
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- rollback: drop index knowledge_base_embedding_idx; alter table knowledge_base alter column embedding type vector(1536);

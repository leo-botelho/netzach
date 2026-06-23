-- Habilitar pgvector
create extension if not exists vector;

-- Base de conhecimento da Sacerdotisa Netzach
create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('banho', 'oleo', 'floral', 'cristal', 'ritual', 'geral')),
  title text not null,
  content text not null,
  embedding vector(384),  -- gte-small = 384 dimensions
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Índice cosine para busca semântica
create index if not exists knowledge_base_embedding_idx
  on knowledge_base using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Função de busca semântica
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

-- Tabela de uso diário (para futura implementação de limites por plano)
create table if not exists sacerdotisa_usage (
  user_id uuid references auth.users(id) on delete cascade,
  date date default current_date,
  count int default 0,
  primary key (user_id, date)
);

-- RLS: conhecimento público para leitura (Edge Function usa service_role)
alter table knowledge_base enable row level security;
create policy "knowledge_base_read" on knowledge_base for select using (true);

-- RLS: usage só o próprio usuário
alter table sacerdotisa_usage enable row level security;
create policy "sacerdotisa_usage_own" on sacerdotisa_usage for all using (auth.uid() = user_id);

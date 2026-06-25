-- Histórico de conversas com a Sacerdotisa
-- Serve agora para "Salvar no Grimório" e futuramente para histórico completo de chat

create table sacerdotisa_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  module      text not null default 'sacerdotisa', -- 'sacerdotisa', 'banho', 'florais', etc.
  prompt      text,                                 -- pergunta da usuária (nullable para migração futura)
  response    text not null,                        -- resposta da sacerdotisa
  saved       boolean default false,               -- true = salvo no grimório pessoal
  created_at  timestamptz default now()
);

create index sacerdotisa_history_user_idx on sacerdotisa_history(user_id, created_at desc);
create index sacerdotisa_history_saved_idx on sacerdotisa_history(user_id, saved) where saved = true;

alter table sacerdotisa_history enable row level security;
create policy "history_own" on sacerdotisa_history for all using (auth.uid() = user_id);

-- rollback: drop table sacerdotisa_history;

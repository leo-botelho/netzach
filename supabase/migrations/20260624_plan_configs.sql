-- Configuração de planos gerenciável pelo admin
create table if not exists plan_configs (
  id          text primary key,          -- 'hecate_mensal', 'isis_anual', etc.
  plan_type   text not null,             -- 'hecate', 'isis', 'lilith'
  name        text not null,
  cycle       text not null check (cycle in ('mensal', 'anual')),
  price       numeric(10,2) not null,
  symbol      text default '✦',
  features    text default '',           -- CSV de features ou texto livre
  active      boolean default true,
  updated_at  timestamptz default now()
);

-- Leitura pública (visitantes veem preços na tela /assinar)
alter table plan_configs enable row level security;
create policy "leitura pública" on plan_configs for select using (true);
-- Escrita apenas via service_role (admin usa supabase.from() com chave anon mas com RLS update)
create policy "admin atualiza planos" on plan_configs for update
  using (exists (
    select 1 from profiles where user_id = auth.uid() and role = 'admin'
  ));
create policy "admin insere planos" on plan_configs for insert
  with check (exists (
    select 1 from profiles where user_id = auth.uid() and role = 'admin'
  ));

-- Dados iniciais (preços em reais)
insert into plan_configs (id, plan_type, name, cycle, price, symbol, active)
values
  ('hecate_mensal',  'hecate',  'Hécate',  'mensal', 29.90,  '🌑', true),
  ('hecate_anual',   'hecate',  'Hécate',  'anual',  249.00, '🌑', true),
  ('isis_mensal',    'isis',    'Ísis',    'mensal', 44.90,  '☽',  true),
  ('isis_anual',     'isis',    'Ísis',    'anual',  389.00, '☽',  true),
  ('lilith_mensal',  'lilith',  'Lilith',  'mensal', 59.90,  '✦',  true),
  ('lilith_anual',   'lilith',  'Lilith',  'anual',  529.00, '✦',  true)
on conflict (id) do nothing;

-- rollback: drop table plan_configs;

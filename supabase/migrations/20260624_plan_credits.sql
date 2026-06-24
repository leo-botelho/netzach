-- Rastreia uso semanal por módulo para controle de créditos por plano
create table if not exists plan_credits (
  user_id    uuid references auth.users(id) on delete cascade,
  week_start date,
  module     text,
  used       int default 0,
  primary key (user_id, week_start, module)
);

create index if not exists plan_credits_user_week on plan_credits(user_id, week_start);

alter table plan_credits enable row level security;

create policy "user gerencia próprios créditos" on plan_credits
  for all using (auth.uid() = user_id);

-- rollback: drop table plan_credits;

-- Preferências de notificação por usuária
-- Cada coluna é um tipo de notificação (true = ativa, false = desativada)
-- Se a linha não existir, assume todos como true (opt-out model)

create table if not exists notification_preferences (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade unique,

  -- Notificações do documento Netzach (seção 8)
  morning_checkin   boolean default true,
  hydration         boolean default true,
  lunch_tea         boolean default false,  -- opt-in (mais intrusivo)
  evening_checkin   boolean default true,
  night_tea         boolean default false,  -- opt-in
  weekly_tarot      boolean default true,
  credits_renewed   boolean default true,
  credits_unused    boolean default true,
  lunar_phase       boolean default true,
  monthly_retro     boolean default true,
  monthly_wheel     boolean default true,

  -- Horários personalizáveis (formato HH:MM, null = padrão do sistema)
  morning_time  text default '07:00',
  evening_time  text default '21:00',

  updated_at timestamptz default now()
);

-- RLS: usuária só vê e edita as próprias preferências
alter table notification_preferences enable row level security;

create policy "user can manage own prefs"
  on notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger updated_at
create or replace function update_notification_preferences_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_notif_prefs_updated_at
  before update on notification_preferences
  for each row execute function update_notification_preferences_updated_at();

-- rollback: drop table notification_preferences cascade;

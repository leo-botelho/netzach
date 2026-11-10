-- ═══════════════════════════════════════════════════════════════
-- Modelos de IA configuráveis pelo painel
--
-- Até aqui a Sacerdotisa só falava com um modelo, fixo no código, com a
-- chave guardada nos segredos da função. Agora a administradora escolhe,
-- pelo painel, a plataforma e o modelo principal e uma reserva (OpenAI,
-- Claude, Gemini ou DeepSeek), e troca quando quiser.
--
-- Duas tabelas:
--   ia_chaves  uma chave por PLATAFORMA, cifrada. Principal e reserva
--              da mesma plataforma (gpt-5.1-mini e gpt-5.4, por exemplo)
--              usam a mesma chave, cadastrada uma vez.
--   ia_config  uma linha só: quem é o principal, quem é a reserva e se
--              a reserva está ligada.
--
-- SEGURANÇA: as duas tabelas ficam trancadas para o navegador. Não há
-- política de leitura, então nem a administradora lê por aqui: tudo passa
-- pela função `ia-config`, que confere se é admin, cifra ao gravar e só
-- devolve os 4 últimos caracteres de cada chave.
--
-- Sem nenhuma linha em ia_config, a Sacerdotisa se comporta como antes
-- (Claude Haiku com a chave dos segredos da função). Nada muda até a
-- administradora configurar.
--
-- Antes de cadastrar a primeira chave é preciso definir o segredo que a
-- cifra, uma vez só:
--   supabase secrets set IA_ENCRYPTION_KEY="<um texto longo e aleatório>"
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.ia_chaves (
  provedor       text primary key
                 check (provedor in ('openai', 'anthropic', 'gemini', 'deepseek')),
  chave_cifrada  text not null,
  -- Só para a tela mostrar "termina em ••••abcd" sem decifrar nada.
  ultimos4       text not null check (length(ultimos4) = 4),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

create table if not exists public.ia_config (
  id                 int primary key default 1 check (id = 1),
  primario_provedor  text not null
                     check (primario_provedor in ('openai', 'anthropic', 'gemini', 'deepseek')),
  primario_modelo    text not null check (length(btrim(primario_modelo)) between 2 and 80),
  reserva_provedor   text
                     check (reserva_provedor in ('openai', 'anthropic', 'gemini', 'deepseek')),
  reserva_modelo     text check (length(btrim(reserva_modelo)) between 2 and 80),
  reserva_ligada     boolean not null default false,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid references auth.users(id) on delete set null,
  -- Reserva ligada sem reserva escolhida não faz sentido.
  check (not reserva_ligada or (reserva_provedor is not null and reserva_modelo is not null))
);

alter table public.ia_chaves enable row level security;
alter table public.ia_config enable row level security;

-- Nenhuma política: só a service_role (as funções) acessa. Os revokes
-- deixam isso explícito, caso alguém crie uma política por engano depois.
revoke all on public.ia_chaves from anon, authenticated;
revoke all on public.ia_config from anon, authenticated;


-- rollback:
--   drop table if exists public.ia_config;
--   drop table if exists public.ia_chaves;

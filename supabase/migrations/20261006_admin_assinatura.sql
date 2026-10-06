-- ═══════════════════════════════════════════════════════════════
-- A admin pode mexer em plano e status das alunas
--
-- A trava criada na fase 1 (protect_profile_columns) devolve os valores
-- antigos de plano, status e vencimento em qualquer alteração vinda do
-- app. Ela existe para a usuária não se promover a Lilith vitalícia
-- editando o próprio perfil, e isso continua valendo.
--
-- O efeito colateral: a Raquel também era barrada. O botão do painel
-- mandava a mudança, o banco aceitava, a trava revertia, e nada
-- acontecia na tela, sem erro nenhum. Bloquear uma aluna que não pagou
-- era impossível pelo painel.
--
-- Agora a trava abre exceção para quem é admin. Continua fechada para
-- a aluna comum.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;  -- service_role: checkout, webhook, cron
  end if;

  if public.is_admin() then
    return new;  -- painel da Raquel
  end if;

  new.plan_type             := old.plan_type;
  new.subscription_status   := old.subscription_status;
  new.subscription_end_date := old.subscription_end_date;
  new.asaas_customer_id     := old.asaas_customer_id;
  new.last_payment_method   := old.last_payment_method;

  -- `role` fica de fora da exceção de propósito: nem a admin promove
  -- outra admin por aqui. Isso se faz no banco, com intenção.
  new.role                  := old.role;

  return new;
end $$;

-- rollback: recriar a versão de 20260819_fase1_seguranca.sql

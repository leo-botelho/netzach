-- ═══════════════════════════════════════════════════════════════
-- Base de conhecimento: a administradora volta a poder excluir pelo painel
--
-- A migration 20260819_fase1_seguranca.sql trocou a leitura pública da
-- tabela por uma policy só de SELECT para admin, e não criou policy de
-- DELETE. Com RLS ligada e sem policy, o Postgres não devolve erro: o
-- DELETE simplesmente apaga zero linhas. O painel não conferia o
-- resultado, então o botão da lixeira "não fazia nada".
--
-- Inserções e alterações continuam só pelas edge functions
-- (ingest-knowledge, ingest-bulk), que usam service_role.
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "knowledge_base_admin_delete" on public.knowledge_base;

create policy "knowledge_base_admin_delete" on public.knowledge_base
  for delete using (public.is_admin());

-- rollback: drop policy if exists "knowledge_base_admin_delete" on public.knowledge_base;

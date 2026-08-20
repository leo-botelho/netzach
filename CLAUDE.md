# NETZACH — Instruções do Projeto

PWA de **bem-estar feminino integrado** — corpo, mente, emoção e espírito. Big Idea: *"Tenha a sua própria sacerdotisa"*. Não é app de astrologia, nem de meditação, nem de hábitos: é a integração dos quatro pilares com personalização profunda (mapa astral, numerologia, ciclo menstrual, check-ins) e uma IA-sacerdotisa que orienta a partir do conhecimento real da fundadora (Raquel Guimarães — terapeuta floral, radiestesista, taróloga).

**IMPORTANTE**: leia `WORKLOG.md` (raiz deste projeto) no início de qualquer sessão — histórico de features, decisões e pendências. Registre lá tudo que implementar, entrada mais recente no topo.

## Fonte da verdade do produto

- **Documento completo**: `.claude/references/Netzach-Documento-Completo.pdf` (v1.0, jun/2026) — todos os módulos, planos, frequências por plano, sistema de dicas contextuais, mandala lunar, tom de voz e regras de implementação. Ler antes de qualquer decisão de escopo.
- **O código é mais novo que o PDF em alguns pontos** — divergências conhecidas na seção "Divergências PDF × código" abaixo. Em conflito: o que está em produção vale até a Raquel decidir; mudanças de produto são decisão dela.

## Stack REAL (o que está no código — DIFERENTE do padrão do workspace)

⚠️ Este projeto **não** segue o padrão Next.js 15/Tailwind v4/Drizzle do workspace. Respeitar a stack existente:

| Camada | Tecnologia REAL |
|--------|-----------------|
| Front | **Vite 7 + React 19 SPA** (react-router-dom v7) — NÃO é Next.js; não há RSC/Server Actions |
| Styling | **Tailwind CSS v3.4** (config JS clássica — NÃO usar sintaxe CSS-first do v4) |
| PWA | vite-plugin-pwa (`injectManifest`) + service worker próprio em `src/sw.ts` — display standalone, portrait |
| Dados | **Supabase JS direto** (`src/lib/supabase.ts`) — sem ORM; RLS por usuária |
| Backend | **Supabase Edge Functions (Deno)** em `supabase/functions/` |
| IA | **Claude API** via SDK na função `sacerdotisa` — RAG com embeddings (pgvector) sobre a base de conhecimento |
| Pagamentos | **Asaas** (checkout + webhook) — NÃO é Stripe |
| Push | Web Push próprio: `push_subscriptions` + `scheduled-notifications` (cron) + `send-push` |
| Deploy | Vercel (front) + Supabase (functions/DB); Dockerfile presente |
| Scripts | `pnpm dev` (porta 5174) · `pnpm build` · `pnpm lint` |

### Edge Functions existentes

`sacerdotisa` (chat IA com personas por plano + RAG) · `calculate-astral-chart` · `ingest-knowledge` / `ingest-bulk` (alimentam a base RAG) · `asaas-checkout` / `asaas-webhook` · `scheduled-notifications` / `send-push`

### Mapa do front

27 páginas em `src/pages/` cobrindo os módulos do PDF (DailyCheckin, BanhoPersonalizado, ChakraDiagnostico, MandalaLunar, MandalaDoMes, RodaDaVida, Sacerdotisa, Oracle, MagiaLunar, SagradoFeminino, LeiAtracao, Hooponopono, CriancaInterior, Numerologia, Sky, Retrospectiva, Temple, checkout, AdminPanel...). Hooks de negócio: `usePlan`, `usePlanCredit`, `useSubscription`, `usePushNotifications`, `useSaveToGrimorio`, `usePWAInstall`. Componentes de gate: `SubscriptionGuard`, `UpgradeModal`.

## Regras de ouro do produto

1. **A Sacerdotisa nunca inventa**: toda resposta da IA vem EXCLUSIVAMENTE da base de conhecimento (RAG) — práticas, ervas, receitas e propriedades fora da base não existem. Feature de IA que responda sem grounding na base está incompleta.
2. **A Sacerdotisa não revela ser IA** (regra do prompt em produção) e **não substitui profissionais de saúde**: menção a sofrimento intenso/crise → acolher + indicar apoio especializado. Aviso de complementaridade em toda orientação de saúde/floral/óleo.
3. **Tom de voz é requisito funcional**: segunda pessoa, nunca punitivo ("que tal tentar hoje?" — nunca "você não fez"), celebra o pequeno, jamais clínico. **Sem travessão (—)** nos textos da Sacerdotisa (regra explícita do prompt). Textos de UI seguem o mesmo tom.
4. **Créditos por plano são a monetização**: todos os planos acessam todos os módulos; a diferença é frequência (renova sexta-feira, não acumula). Toda feature nova de consulta passa pelo sistema de créditos (`plan_configs`/`plan_credits`/`usePlanCredit`) e pelo `SubscriptionGuard` — com a mensagem de upsell amorosa do padrão do PDF, nunca paywall seco.
5. **Dados sensíveis (LGPD)**: ciclo menstrual, humor, saúde, sonhos e emoções são dados sensíveis — RLS testada em qualquer tabela nova, nunca logar conteúdo emocional/de saúde, consentimento claro, exportação/exclusão possíveis. Nada disso vai para analytics de marketing individualizado.
6. **Notificações são personalizáveis e gentis** (horários configuráveis, pausáveis) — máximo 1 dica contextual/dia, prioridade emocional > sono > corpo (regra do PDF).

## Divergências PDF × código (resolver com a Raquel antes de "corrigir")

| Tema | PDF | Código | Status |
|------|-----|--------|--------|
| Paleta | Noite sagrada #2E1F5E, violeta #8B5CF6 | Manifest usa #8B1FC8 / fundo #1C0A38 | Decidir a oficial antes de rebrand de UI |
| Limites da Sacerdotisa | 1/3/ilimitado por módulo/semana | `sacerdotisa`: hecate 5, isis 20, lilith -1 (chat) | Chat tem limite próprio — confirmar tabela |
| Módulos | Diário de sonhos, rastreamento de hábitos detalhado | Verificar cobertura real página a página | Auditoria pendente |

Nunca "corrigir" o código para bater com o PDF (ou vice-versa) sem decisão registrada no WORKLOG.

## Agentes disponíveis neste projeto

Os 12 agentes do squad-dev (`tech-lead`, `backend-developer`, `api-specialist`, `frontend-developer`, `fullstack-developer`, `web-designer`, `ux-designer`, `typescript-pro`, `code-reviewer`, `mobile-developer`, `devops-developer`, `scraper-tester`) estão copiados em `.claude/agents/` — funcionam abrindo o Claude Code direto em `C:\Users\raque\dev\netzach`.

Eles apontam para as skills compartilhadas em `C:\Users\raque\dev\.claude\` (sem duplicação aqui). Fonte de verdade dos agentes: `C:\Users\raque\dev\.claude\agents\` — se atualizar lá, recopiar para cá.

**Adaptações obrigatórias ao usar os agentes neste projeto** (eles assumem o padrão Next.js do workspace):

- `frontend-developer`: ignorar App Router/RSC/Server Actions — aqui é SPA Vite com react-router; Tailwind **v3** (ignorar skill de v4/CSS-first); TanStack Query não está instalado (padrão atual: hooks próprios + Supabase client)
- `backend-developer`: Edge Functions Deno é o runtime de backend deste projeto (não há worker Node); Supabase client direto, sem Drizzle
- `api-specialist`: integrações = Asaas (pagamentos) e Web Push; webhooks do Asaas com validação e idempotência
- `mobile-developer`: o "mobile" deste projeto é a **PWA** (service worker, manifest, push, instalação) — não React Native
- `ux-designer`/`web-designer`: tom e identidade do PDF são lei; UI mobile-first portrait

Fluxo padrão: `tech-lead` define → `backend-developer` (functions/migrations) + `frontend-developer` (SPA) em paralelo → `typescript-pro` → `code-reviewer` (+ csreview) → `devops-developer` (Vercel + Supabase).

## Cuidados técnicos específicos

- **Migrations via Supabase CLI** (`supabase/migrations/` — padrão já estabelecido `AAAAMMDD_nome.sql`); nunca editar tabela direto no dashboard em produção
- **Embeddings**: dimensões da base RAG já foram corrigidas uma vez (`20260625_fix_embedding_dimensions.sql`) — mudança de modelo de embedding exige migração planejada da base inteira
- **Service worker**: `src/sw.ts` com `injectManifest` — mudanças em push/cache passam por teste real de instalação PWA (Chrome + Android), não só no dev server
- **Asaas**: webhook é a fonte de verdade da assinatura; checkout sem webhook confirmado não libera plano
- **Créditos**: renovação toda sexta (cron) — qualquer mudança no cron testa o fuso (America/Sao_Paulo)
- Secrets via `supabase secrets set` — nunca hardcoded

## Pontes com os outros squads

- **Marketing**: o squad de marketing do app vive em `C:\Users\raque\dev\raquel-guimaraes` (CMO + 11 agentes). Demandas de LP/tracking/eventos de app que chegarem de lá entram como especificação em `.claude/output/` de lá — implementação é daqui.
- **Specs de eventos de analytics** (trial, assinatura, ativação) virão do `analista-dados` do squad de marketing — implementar como eventos do app quando chegarem.

## Onde encontrar mais contexto

- `WORKLOG.md` (raiz) — histórico de features e decisões (criado hoje; alimentar sempre)
- `.claude/references/Netzach-Documento-Completo.pdf` — o produto completo
- `schema_dump.sql` (raiz) — snapshot do schema
- `.claude/output/` — entregas dos agentes que não pertencem a pasta de código

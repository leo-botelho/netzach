# Como colocar no ar

Roteiro das mudanças de 19/08/2026. **A ordem importa**: dois passos, se
pulados, quebram coisas que hoje funcionam.

Tempo estimado: 20 a 30 minutos.

---

## Antes de começar

**Faça um backup.** No painel do Supabase: `Database → Backups`. Se houver
o botão de backup manual, use. Nada aqui apaga dados, mas duas migrations
alteram tabelas em uso (`profiles` e as políticas de acesso), e voltar
atrás sem backup é trabalhoso.

---

## Passo 0 — Ligar duas extensões do banco

No painel: **Database → Extensions**. Procure e ligue:

- **`pg_cron`** — os agendamentos
- **`pg_net`** — as chamadas que o agendador faz às funções

Sem elas, a última migration para com
`ERROR: schema "cron" does not exist` — e agora com uma mensagem
explicando o que fazer, em vez do erro cru do Postgres.

---

## Passo 1 — Os dois segredos (obrigatório, faça primeiro)

Sem estes dois, coisas que hoje funcionam param de funcionar.

> **Os valores destes dois segredos não ficam neste arquivo**, que vai
> para o repositório. Estão na conversa em que foram gerados, e no
> painel do Supabase depois de configurados. Para gerar novos:
> `python -c "import secrets,string;print(''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(40)))"`

**A chave interna**, que o agendador usa para se identificar:

```bash
npx supabase secrets set INTERNAL_TASK_SECRET="COLE_AQUI_O_VALOR"
```

**A senha do webhook do Asaas.** É um valor que *você inventa* — o
Asaas não fornece nenhum. O cadastro do webhook em si fica para o
Passo 5, depois das funções estarem publicadas.

```bash
npx supabase secrets set ASAAS_WEBHOOK_TOKEN="COLE_AQUI_O_VALOR"
```

> ⚠️ **Sem este segundo**, o webhook recusa tudo com erro 503 — de
> propósito. Hoje ele aceitaria qualquer requisição, que era o furo.

Opcional, para fechar o CORS ao seu domínio:

```bash
npx supabase secrets set ALLOWED_ORIGINS="https://seudominio.com.br"
```

---

## Passo 2 — As migrations, nesta ordem

Cole cada arquivo no **SQL Editor** do Supabase e rode. Um de cada vez,
conferindo se deu certo antes de ir para o próximo.

| # | Arquivo | O que faz |
|---|---------|-----------|
| 1 | `20260819_fase1_seguranca.sql` | Trava os créditos, fecha a base de conhecimento, protege as colunas de plano |
| 2 | `20260819_corrige_schema_base.sql` | Cria `notification_preferences`, fecha o conteúdo público, remove o gatilho do N8N |
| 3 | `20260819_sonhos_e_dicas.sql` | Diário de sonhos e dicas contextuais |
| 4 | `20260819_notificacoes_personalizadas.sql` | Controle de envio das notificações |
| 5 | `20260819_quadro_sonhos_lgpd.sql` | Quadro dos sonhos e exportação de dados |
| 6 | `20260819_memoria_conversa.sql` | Memória da Sacerdotisa |
| 7 | `20260819_registro_erros.sql` | Registro de falhas, com aba no painel |
| 8 | `20260819_agendamentos.sql` | **Todos os agendamentos** ⚠️ *substituir 3 valores* |
| 9 | `20260921_cursos.sql` | Área de cursos: cursos, módulos, aulas, acessos, progresso e comentários |
| 10 | `20260921_duvidas.sql` | Caixa de dúvidas dos cursos e a opção de aviso de resposta |
| 11 | `20261006_admin_assinatura.sql` | A admin pode bloquear e liberar alunas pelo painel |
| 12 | `20261104_mapa_astral_automatico.sql` | **Mapa astral calculado sozinho no cadastro** ⚠️ *substituir 2 valores* |
| 13 | `20261110_ia_modelos.sql` | Modelos de IA configuráveis pelo painel (chaves cifradas, principal e reserva) |
| 14 | `20261112_knowledge_base_excluir.sql` | A administradora volta a poder excluir itens da base de conhecimento pelo painel |

**Só o arquivo 8 pede substituição**, e é o único que depende das
extensões do Passo 0. Se ele falhar, os sete primeiros continuam
valendo: o portal funciona, só as tarefas automáticas ficam pendentes.

**O arquivo 12 pede substituição, como o 8:** `<PROJECT_REF>` e `<INTERNAL_SECRET>`, os mesmos
valores dos agendamentos. Ele devolve ao cadastro o cálculo do mapa astral que o gatilho do N8N
fazia e que foi removido em 19/08 sem um substituto de fato. Se existir um Database Webhook
`netzach-astral-chart` criado à mão no painel, apague-o: com os dois o cálculo roda duas vezes.
E publique também a função `calculate-astral-chart`, que passou a calcular o fuso do dia do
nascimento (com horário de verão), em vez de `-3` fixo.

**O arquivo 10 depende do 9.** E rode os dois logo depois de publicar o app: a tela
de Perfil já grava a opção "Respostas às suas dúvidas", e enquanto a coluna não
existir no banco, salvar as preferências de notificação falha.

**O arquivo 9 tem que vir depois do 5 e do 6.** Ele recria as funções de
exportar e excluir os dados da usuária para incluir os cursos. Rodado
antes, seria sobrescrito por eles e os cursos ficariam fora da LGPD.

**O arquivo `00000000_schema_base.sql` não precisa ser rodado.** Ele
descreve o que já existe, e serve para recriar o banco do zero se um dia
for preciso.

### O arquivo que pede substituição

No arquivo 8, troque três valores antes de rodar:

| Trocar | Por |
|--------|-----|
| `<PROJECT_REF>` | `njevwglmpmqdaezlnbdc` |
| `<SERVICE_KEY>` | a chave em `Settings → API → service_role` |
| `<INTERNAL_SECRET>` | o mesmo valor do Passo 1 |

> ⚠️ **Se pular o arquivo 8**, as notificações agendadas param de sair.
> As funções passaram a exigir identificação, e é ele que ensina o
> agendador a se identificar.

---

## Passo 3 — Publicar as funções

Todas mudaram, direta ou indiretamente:

```bash
npx supabase functions deploy
```

Se preferir uma a uma: `sacerdotisa`, `asaas-checkout`, `asaas-webhook`,
`calculate-astral-chart`, `ingest-knowledge`, `ingest-bulk`, `send-push`,
`scheduled-notifications`, `testar-conhecimento`, `responder-duvida`.

### Se o `supabase functions deploy` não abrir, ou se preferir o painel

**O CLI novo (3.x e as 2.1xx recentes) pode travar com "Illegal instruction".** O programa é compilado com
uma extensão de processador (AVX2) que nem todo computador tem, e a falha não tem relação com o projeto.
Use uma versão antiga, do tempo em que o programa era feito em Go, trocando `supabase` por `supabase@2.40.7`:

```bash
npx supabase@2.40.7 functions deploy ia-config --use-api
```

**Pelo painel do Supabase** (Edge Functions → a função → editor): o painel só envia o arquivo da função e
deixa para trás a pasta `_shared`, por isso falha com "Module not found ... _shared/auth.ts". Gere um arquivo
único por função, com o código compartilhado embutido:

```bash
node scripts/empacotar-funcoes.mjs
```

Os arquivos saem em `funcoes-para-colar/<função>/index.ts`: cole o conteúdo no editor e publique. Para uma só,
`node scripts/empacotar-funcoes.mjs sacerdotisa`. Funções novas (como `ia-config`) entram em *Deploy a new
function → Via Editor*. **Gere de novo depois de qualquer mudança nos fontes**, e não edite os arquivos gerados.

Cuidado com o *Verify JWT* de cada função: as chamadas feitas pelo banco ou por serviços de fora (`calculate-astral-chart`,
`scheduled-notifications`, `send-push`, `asaas-webhook`) não trazem login de aluna e precisam dele **desligado**.
Só republique essas pelo painel se tiver certeza de que a opção continua desligada depois.

**Modelos de IA pelo painel (arquivo 13).** Para a aba "Netzach IA" guardar chaves, falta definir,
uma vez, o segredo que as cifra no banco, e publicar duas funções:

```bash
npx supabase secrets set IA_ENCRYPTION_KEY="<uma frase longa e aleatória, 24 caracteres ou mais>"
```

```bash
npx supabase functions deploy ia-config --use-api
```

```bash
npx supabase functions deploy sacerdotisa --use-api
```

Guarde esse segredo em lugar seguro: **se for perdido ou trocado, as chaves cadastradas deixam de abrir**
(basta cadastrá-las de novo). Enquanto nada for configurado no painel, a Sacerdotisa segue usando o
Claude Haiku com a chave `ANTHROPIC_API_KEY` dos segredos, como antes. Publicar a `sacerdotisa` antes de
rodar a migration 13 é seguro: sem as tabelas, ela cai nesse padrão.

`responder-duvida` é nova (resposta da Raquel às dúvidas dos cursos, com aviso
para a aluna). `send-push` mudou junto: as duas usam `_shared/push.ts`.

---

## Passo 4 — Publicar o app (e as variáveis de build)

O app é publicado pela **Cloudflare Pages**, a cada push na `main`. O Vite **embute no código**,
na hora do build, as variáveis que começam com `VITE_`. Faltando uma delas na Cloudflare, o app é
montado sem ela e **o recurso correspondente não funciona, sem erro nenhum**. Em Workers & Pages →
(o projeto) → Settings → Variables and Secrets, confira que existem, em **Production**:

| Variável | O que é | Se faltar |
|----------|---------|-----------|
| `VITE_SUPABASE_URL` | Endereço do projeto Supabase | O app nem abre |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase | O app nem abre |
| `VITE_VAPID_PUBLIC_KEY` | A **chave pública** do par VAPID das notificações (começa com `B`, uns 87 caracteres) | **"Ativar notificações" não faz nada**; o iPhone só deixa o botão dourado por ter sido tocado |

Variável de build só vale no **próximo** build: depois de criar ou mudar uma, faça *Retry
deployment* (ou um novo push) e depois confira na Cloudflare que o build terminou.

**A chave do `VITE_VAPID_PUBLIC_KEY` tem de ser a pública do mesmo par cujas chaves estão em
`VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` no Supabase.** Se você não a tem guardada, os valores dos
segredos do Supabase não podem ser lidos de volta. Gere um par novo e atualize os dois lados:

```bash
npx web-push generate-vapid-keys
```

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="<a pública>" VAPID_PRIVATE_KEY="<a privada>"
```

Gerar um par novo invalida as inscrições de notificação que já existam (as alunas precisariam
ativar de novo), o que não importa se ninguém conseguiu ativar até agora.

Para conferir no app publicado, abra o Perfil: no fim da página aparece a versão (`Versão
3a0049f · 04/11 15:52`), que é o commit do deploy.

Localmente: `pnpm build`, com as variáveis no `.env` (veja `.env.example`).

---

## Passo 5 — Cadastrar o webhook no Asaas

**Faça agora, não antes** — se cadastrar com as funções ainda antigas,
o Asaas registra falhas de entrega.

No painel do Asaas, em **Integrações → Webhooks**, crie um novo:

- **URL:** `https://njevwglmpmqdaezlnbdc.supabase.co/functions/v1/asaas-webhook`
- **Token de autenticação:** o mesmo `ASAAS_WEBHOOK_TOKEN` do Passo 1
- **Versão da API:** v3
- **Email para falhas:** o seu

**Eventos a marcar.** Nomes conferidos um a um com o seu painel; os
demais podem ficar marcados sem problema, porque a função responde e
ignora o que não reconhece.

Em **Cobranças**:

| Evento | O que faz |
|---|---|
| `PAYMENT_CONFIRMED` | **Libera** — pago, saldo ainda a compensar |
| `PAYMENT_RECEIVED` | **Libera** — recebido de fato |
| `PAYMENT_OVERDUE` | Bloqueia — venceu sem pagar |
| `PAYMENT_DELETED` | Bloqueia — cobrança removida |
| `PAYMENT_REFUNDED` | Bloqueia — estornada |
| `PAYMENT_CHARGEBACK_REQUESTED` | Bloqueia — cliente contestou |
| `PAYMENT_CHARGEBACK_DISPUTE` | Bloqueia — contestação em disputa |
| `PAYMENT_RECEIVED_IN_CASH_UNDONE` | Bloqueia — recebimento desfeito |
| `PAYMENT_REPROVED_BY_RISK_ANALYSIS` | Bloqueia — cartão reprovado |
| `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` | Bloqueia — captura recusada |

Em **Assinaturas**, só dois interessam:

| Evento | O que faz |
|---|---|
| `SUBSCRIPTION_INACTIVATED` | Bloqueia |
| `SUBSCRIPTION_DELETED` | Bloqueia |

**Quatro eventos ficaram de fora de propósito**, por não terem resposta
óbvia. Se algum acontecer, ajuste o acesso à mão pelo painel:

- `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` — você ganhou a disputa e o
  valor volta. Não bloqueia; reativar sozinho também não, porque o
  acesso pode já ter sido devolvido antes.
- `PAYMENT_PARTIALLY_REFUNDED` — estorno parcial não diz se a
  assinatura continua valendo. É decisão sua.
- `PAYMENT_RESTORED` e `PAYMENT_REFUND_DENIED` — devolvem a cobrança ao
  estado válido, mas reativar acesso a partir deles seria supor demais.

> **Por que não há evento de "assinatura ativada" ou "renovada":** o
> Asaas não emite nenhum. Toda cobrança paga chega como
> `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`, seja a primeira ou a
> décima. O código distingue uma da outra pelo estado anterior do
> perfil, para não mandar "bem-vinda ao plano" todo mês.

---

## Passo 6 — Conferir que ficou de pé

**Os agendamentos foram recadastrados:**

```sql
select jobname, schedule, active from cron.job where jobname like 'netzach-%';
```

Devem aparecer quinze. Os dois check-ins com `*/15 * * * *`, os créditos
renovados com `0 11 * * 1` (segunda), e três faxinas de madrugada.

**Os créditos ficaram protegidos** — logada como assinante comum, isto
deve falhar:

```sql
update plan_credits set used = 0 where user_id = auth.uid();
```

**A base de conhecimento fechou** — sem login, isto deve voltar vazio:

```
https://njevwglmpmqdaezlnbdc.supabase.co/rest/v1/knowledge_base?select=title&apikey=SUA_ANON_KEY
```

**Um pagamento de teste**, de ponta a ponta. Checkout e webhook mudaram
juntos, e é o único jeito de saber se conversam: gere um PIX no ambiente
de testes do Asaas, pague, e confirme que o plano libera.

**Publique um alerta no Céu da Semana** pelo painel. É o único ponto que
depende de a tabela de horóscopos aceitar os tipos novos; se der erro
aqui, me avise que é ajuste de um minuto.

---

## Se algo der errado

Cada migration termina com um bloco `-- rollback:` comentado, dizendo
como desfazer aquele arquivo.

O caso mais provável de susto: **as notificações pararem**. Quase sempre
é o arquivo 8 não ter sido rodado, ou o `INTERNAL_SECRET` do agendamento
estar diferente do que foi configurado no Passo 1.

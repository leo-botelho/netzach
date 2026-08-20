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

**Só o arquivo 8 pede substituição**, e é o único que depende das
extensões do Passo 0. Se ele falhar, os sete primeiros continuam
valendo: o portal funciona, só as tarefas automáticas ficam pendentes.

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
`scheduled-notifications`.

---

## Passo 4 — Publicar o app

Pelo caminho de sempre (Vercel). Se for por linha de comando:

```bash
pnpm build
```

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

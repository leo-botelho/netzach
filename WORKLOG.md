# WORKLOG — Netzach

Histórico de features, decisões técnicas e pendências do projeto. Entrada mais recente no topo. Todo agente lê este arquivo no início da sessão e registra o que implementar.

## 2026-08-25 — Recuperacao de senha e emails com a identidade do Netzach

Nao havia como recuperar senha. Quem esquecesse perdia a conta: nao existia rota, nao existia
link na tela de entrada, e os emails do Supabase saiam com o template branco de fabrica.

### Telas novas
- `src/pages/EsqueciSenha.tsx` (`/esqueci-senha`) — pede o email e chama
  `resetPasswordForEmail` com `redirectTo` para `/nova-senha`. **A resposta e sempre a mesma,
  exista a conta ou nao**: dizer "esse email nao esta cadastrado" entregaria a qualquer pessoa
  a lista de quem assina o portal. So erro de rede (`status !== 400`) aparece para a usuaria.
- `src/pages/NovaSenha.tsx` (`/nova-senha`) — escuta `onAuthStateChange` procurando
  `PASSWORD_RECOVERY`, porque a sessao vinda do link e criada **depois** da montagem do
  componente; checar uma vez so daria falso negativo. Tres estados: sintonizando, link
  expirado (com botao para pedir outro) e formulario. Minimo de 8 caracteres, com confirmacao.
- Link "Esqueci minha senha" em `Login.tsx`; as duas rotas ficam **fora** do bloco protegido
  em `App.tsx` — quem esqueceu a senha nao tem sessao.

### Emails (`supabase/templates/`)
Cinco templates prontos para colar no painel: confirmar-cadastro, redefinir-senha,
link-magico, trocar-email, convite. Mais `_base.html`, que e o molde e **nao vai para o
Supabase**.

Decisao de implementacao: tabela aninhada com estilo embutido em cada tag. Nao e preferencia,
e necessidade — o Gmail descarta `<style>` do cabecalho, o Outlook desenha com o motor do
Word, e nenhum dos dois entende flexbox ou grid. Cormorant Garamond nao carrega em cliente de
email: todo titulo leva Georgia de reserva.

Paleta do documento (secao 13). O `#8674A6` do rascunho dava 3,43:1 sobre o cartao, abaixo do
minimo de 4,5 para texto pequeno — trocado por `#A294C2` (5,12:1) em todos os arquivos. Texto
corrido 11,76:1, dourado sobre o cartao 6,23:1, texto do botao sobre o dourado 6,23:1.

### `EMAIL.md`
Guia da configuracao inteira: dominio no Resend, os registros de DNS, chave de API, SMTP no
Supabase (`smtp.resend.com`:465, usuario literal `resend`, senha = chave `re_...`) e a
tabela de qual arquivo vai em qual aba.

**O ponto que mais gera confusao esta na etapa 3**: sem `/nova-senha` na lista de
**Redirect URLs**, o email chega, o link funciona, e a pessoa cai na home em vez da tela de
trocar a senha. O Supabase ignora silenciosamente qualquer destino fora da lista.

Motivo de trocar o envio padrao: o SMTP embutido do Supabase entrega **2 emails por hora** e
e declaradamente so para teste.

### Pendente
- Raquel executar `EMAIL.md` (conta Resend, DNS, SMTP, colar os cinco templates)
- Depois de configurar, rodar o teste de ponta a ponta descrito na secao "Testar"
- Continua pendente: rodar `supabase/diagnostico-base.sql` (hipotese do nome das plantas
  perdido no fatiamento) e as 8 migrations pelo SQL Editor

---

## 2026-08-19 — Sacerdotisa citando a base, interrogando e errando o floral

Primeiro teste real depois do deploy. A memoria funcionou (ela manteve o contexto entre tres
mensagens), mas a Raquel apontou tres problemas na mesma conversa.

### 1. Ela disse "a historia de Jennifer, na base que tenho"
**A causa estava no proprio prompt.** A regra tinha um exemplo literal:

    "Nao encontrei orientacoes sobre isso na minha base agora. (...)
     assim posso te guiar com o que tenho disponivel."

Ou seja, o prompt ensinava a mencionar a base. E a base contem historias de casos, que ela
passou a narrar para a assinante.

Regras reescritas:
- **Nunca mencionar o material**, de nenhuma forma. A assinante nao sabe que existe base e
  nao deve saber; para ela, a sacerdotisa simplesmente sabe.
- Sem material sobre o tema, **nao anunciar isso**: oferecer o mais proximo ou perguntar, em
  vez de dizer "nao encontrei".
- **Nunca narrar a historia de outra pessoa.** Casos e nomes na base sao referencia para a
  sacerdotisa, nao conteudo para repetir. A assinante veio falar da vida dela.

### 2. Tres pedidos de banho, nenhum banho
A usuaria pediu banho na primeira mensagem e recebeu tres rodadas de perguntas. O prompt nao
dizia quando entregar e quando perguntar.

- **Quando ela pede uma pratica, entregue nesta resposta.** Nao a faca pedir duas vezes.
- Pergunta so **depois** de ja ter entregue algo concreto.
- **Nunca responder so com perguntas.** Uma resposta que so interroga e uma resposta que falhou.
- Faltando informacao: escolher a leitura mais provavel, entregar, e oferecer ajustar.

### 3. Floral errado com convicção
Ela indicou **WILD OAT** para medo de assalto. Wild Oat trata incerteza sobre proposito de
vida; para medo de algo concreto e conhecido, nao serve. E a descricao que ela deu do floral
estava correta — errou a aplicacao, nao a definicao.

Isso nao e problema de prompt, e do material que chegou ate ela. Adicionada regra de conferir
o que a essencia trata antes de indicar, e que **indicar a errada com conviccao e pior do que
nao indicar**. Mas a correcao de fato depende da base.

**Nova ferramenta: "O que ela recebe"**, na aba de conhecimento do painel. A Raquel escreve
uma pergunta como uma assinante escreveria e ve exatamente o material que chegaria ate a
sacerdotisa, com a nota de proximidade — e tambem **o que existe na base mas ficou de fora**
por pouco.

E o que separa as duas causas possiveis de uma resposta ruim: material errado chegando, ou
material certo que nao chegou. Nao chama o modelo, entao e instantaneo e nao custa nada.

Edge function nova: `testar-conhecimento` (so admin).

### Verificado
181 testes · tipos e lint limpos · build completo.

## 2026-08-19 — Agendamentos separados das tabelas

A Raquel bateu no erro `schema "cron" does not exist` ao rodar as migrations. Era
`pg_cron`/`pg_net` desativadas — nao os valores substituidos, como parecia a principio.

**O erro expos uma fragilidade real**: quatro migrations misturavam criacao de tabela com
agendamento. Se o cron falhasse, o SQL Editor podia deixar a migration pela metade, com a
tabela criada e a funcao nao, ou nem isso.

### O que mudou
- **`20260819_agendamentos.sql`**: todos os quinze agendamentos num arquivo so — as doze
  notificacoes e as tres faxinas (envios, conversas, erros). Absorve e substitui
  `20260819_cron_segredo_interno.sql`, que foi removido.
- **As migrations de tabela nao tocam mais em cron.** Se o agendamento falhar, o portal
  continua funcionando; so as tarefas automaticas ficam pendentes.
- **Mensagem de erro decente**: o arquivo de agendamentos verifica as extensoes no inicio e
  para com "Ligue a extensao pg_cron antes: painel → Database → Extensions", em vez do erro
  cru do Postgres.
- **Um unico arquivo pede substituicao** de valores agora, em vez de dois.
- `supabase/verificar-extensoes.sql` — diagnostico do que esta instalado e do que falta.

### Nota
Quando ela disse que tinha sido engano proprio, eu aceitei e segui. Nao era: o diagnostico
correto ja estava no aviso que eu tinha acabado de escrever, e valia ter insistido em olhar
antes de encerrar o assunto.

## 2026-08-19 — Fase 4: memoria da Sacerdotisa e registro de falhas

### Memoria de conversa
Ate aqui cada mensagem chegava ao modelo sozinha. A tela mostrava o historico, o que dava a
impressao de que ela lembrava — mas "estou ansiosa" seguido de "e para dormir?" chegava sem
contexto nenhum. Era um defeito que parecia funcionalidade quebrada.

Agora a sacerdotisa lembra das **tres ultimas trocas** do chat livre. Os modulos continuam
sendo consultas independentes: arrastar contexto entre eles confundiria mais do que ajudaria.

**O historico vem do banco, nunca do cliente.** Se viesse de la, seria possivel forjar falas
da sacerdotisa e induzi-la a quebrar as proprias regras — a mesma razao pela qual os prompts
sairam do navegador na Fase 1. Tabela `sacerdotisa_messages`, com insercao apenas por
service_role; a usuaria so le e apaga.

**Retencao de 30 dias**, com faxina diaria. Conversa fala de emocao, corpo e sofrimento (§16):
guardar para sempre o que serve por alguns dias nao se justifica. O que ela quer manter, salva
no Grimorio — que continua em tabela separada.

**Botao de recomecar** no cabecalho do chat: a memoria torna necessario poder virar a pagina.
Apaga a conversa guardada, nao o Grimorio.

**Custo**: R$ 0,025 por consulta hoje, R$ 0,032 com as tres trocas (+29%). Com 200 assinantes
e 20 consultas por mes, sao R$ 28 a mais por mes.

### Prompt caching: instrumentado em vez de suposto
Corrigi o caching na Fase 1 separando o bloco estavel do volatil, mas **medi o bloco estavel e
sao 913 tokens** — abaixo do minimo para cachear. Ou seja, a correcao esta certa e ainda assim
pode nao render nada.

Em vez de supor, a funcao agora registra a cada consulta: tokens de entrada, de saida,
escritos em cache e lidos do cache. Depois do deploy, basta olhar os logs da funcao: **se
`cache_lidos` ficar sempre em zero, o `cache_control` nao entrega nada e pode sair.**

Isto tambem corrige uma afirmacao minha anterior: eu tinha estimado o bloco estavel em
1.500 a 1.800 tokens. Sao 913.

### Registro de falhas, no lugar do Sentry
A Raquel perguntou se o Sentry roda no Brasil. Nao roda — servidores nos EUA e Europa, e o
banco dela esta em Sao Paulo. Mandar erros para fora seria transferencia internacional de
dados, com exigencia propria na LGPD.

Feito no proprio Supabase: tabela `error_logs`, `ErrorBoundary` gravando nela, retencao de 60
dias e **uma aba nova no painel** ("9. Falhas") mostrando o que quebrou nos ultimos 7 dias,
agrupado por mensagem, com quantas vezes e quantas pessoas foram afetadas.

Zero custo, zero transferencia internacional, e responde a pergunta que importa: quebrou o
que, onde, e para quantas.

### Pre-requisito que faltava documentar
As migrations de agendamento assumiam `pg_cron` e `pg_net` habilitadas e nao diziam isso. O
erro que aparece e `schema "cron" does not exist`, que nao explica nada. Aviso adicionado nas
quatro migrations que usam cron e como Passo 0 do DEPLOY.md.

### Verificado
181 testes passando · tipos limpos · lint sem erros · sintaxe das edge functions · build
completo.

### Migrations novas
`20260819_memoria_conversa.sql` e `20260819_registro_erros.sql`.

## 2026-08-19 — Webhook do Asaas: nomes de evento errados desde sempre

A Raquel foi cadastrar o webhook e mandou a lista real de eventos do painel. **Quatro dos
que o codigo esperava nao existem no Asaas.**

| No codigo | Realidade |
|---|---|
| `SUBSCRIPTION_ACTIVATED` | nao existe |
| `SUBSCRIPTION_RENEWED` | nao existe |
| `SUBSCRIPTION_DEACTIVATED` | chama-se `SUBSCRIPTION_INACTIVATED` |
| `PAYMENT_CHARGEBACK` | chama-se `PAYMENT_CHARGEBACK_REQUESTED` |

**Eu repeti dois desses erros** ao listar para ela os eventos a marcar no painel, antes de
ver a lista verdadeira. Corrigido nos dois lugares (funcao e DEPLOY.md).

### O que isso significava na pratica
**Nao havia webhook cadastrado no Asaas.** Sem ele:
- **PIX nunca liberava acesso**: o QR aparece, a assinante paga, e nada acontece. Alguem
  tinha que ativar na mao pelo painel.
- **Renovacao de cartao nao estendia a validade**: `subscription_end_date` nunca era
  atualizado, entao depois de um mes a assinante era bloqueada **mesmo pagando em dia**,
  enquanto o Asaas seguia cobrando.
- **Inadimplente continuava com acesso.**

### Correcoes
- Lista de eventos alinhada um a um com o painel, com o efeito de cada um comentado.
- **Quatro eventos ficaram deliberadamente de fora**, documentados: `AWAITING_CHARGEBACK_REVERSAL`
  (disputa ganha, nao deve bloquear), `PARTIALLY_REFUNDED` (ambiguo), `RESTORED` e
  `REFUND_DENIED` (reativar sozinho suporia demais).
- **Deteccao de renovacao reescrita**: como o Asaas nao emite evento de renovacao, o codigo
  usava `event.includes('RENEW')`, que nunca era verdadeiro. Agora compara com o estado
  anterior do perfil — se ja estava ativa, e renovacao, e o push de boas-vindas nao sai.

### DEPLOY.md
Roteiro completo de publicacao, em seis passos, com a ordem que importa e cinco verificacoes
no fim. Inclui o passo de cadastrar o webhook **depois** de publicar as funcoes, com a tabela
de eventos conferida.

Os dois segredos ja estao gerados e anotados no proprio roteiro.

## 2026-08-19 — Schema real extraido: quatro achados novos

O `supabase db dump` falhou (exige Docker). Extraido por consulta no SQL Editor
(`supabase/extrair-schema.sql`). O retrato do banco de producao revelou coisas que **nenhum
arquivo do repositorio mostrava**.

### 1. `notification_preferences` NUNCA EXISTIU em producao
A migration `20260623_notification_preferences.sql` esta no repositorio desde junho e nunca
foi aplicada. O Perfil grava as preferencias e os horarios nessa tabela; as notificacoes
agendadas a consultam. **As duas coisas falhavam em silencio desde sempre** — e a
personalizacao de horario que implementei hoje dependia dela.

Criada em `20260819_corrige_schema_base.sql`.

### 2. Gatilho envia dados sensiveis para fora a cada atualizacao
`public.profiles` tem um trigger `profilesUpdate` que dispara a cada INSERT ou UPDATE:

    https://webhook.smartskillshub.com.br/webhook/supabase-netzach

Manda o **registro inteiro do perfil**: data de nascimento, peso, altura e
`last_period_date`. Exatamente o que o §16 classifica como sensivel. E o fluxo antigo do N8N
que a edge function `calculate-astral-chart` substituiu (o comentario dela diz "Replica o
fluxo N8N supabase-netzach").

**Nao removido**: se ainda alimenta algum processo, remover quebraria em silencio. Precisa da
decisao da Raquel. O comando esta documentado na migration.

### 3. `profiles.user_id` aceitava nulo — e todas as policies dependem dele
As quatro policies usam `auth.uid() = user_id`. Uma linha com `user_id` nulo fica **invisivel
para a propria dona**: ela loga e o portal age como se nao tivesse perfil. Preenchido a partir
de `id` (guardam o mesmo valor) e a coluna passou a exigir valor.

Aproveitando: a policy "Usuaria ve proprio perfil" era `for all`, ou seja, cobria UPDATE e
DELETE de qualquer coluna. Ja existem policies especificas de select/insert/update, entao ela
so ampliava. Removida.

### 4. Todo o conteudo de assinatura era legivel sem login
`horoscopes`, `rituals`, `tarot_cards`, `daily_insights`, `contents` e `services_catalog`
tinham leitura `to public using (true)` — e `public` inclui visitante anonimo. Horoscopos,
rituais, cartas e o arcano do dia saiam por uma requisicao REST sem conta.

Passaram a exigir sessao. `plan_configs` ficou de fora de proposito: a tela de assinatura
mostra precos antes do cadastro.

### Correcoes de coisas que eu tinha suposto
- **Nome de policy errado na minha migration**: eu tinha escrito `plan_credits_own`; o nome
  real e `"user gerencia proprios creditos"`. O `drop` nao teria efeito e a policy permissiva
  continuaria valendo — ou seja, o furo dos creditos seguiria aberto. Corrigido.
- **`is_admin()` ja existia** no banco, usada por `policy_read_profiles`. Minha migration faz
  `create or replace` com a mesma assinatura, entao convive.
- **Quadro dos Sonhos usava as areas erradas**: eu tinha seguido o documento (vida emocional,
  autoconhecimento, criatividade), mas a `roda_da_vida` real tem outras (amor, familia,
  amizades). O quadro precisa falar a mesma lingua da roda que a usuaria preenche, nao a do
  documento. Alinhado.

### Divergencias que ficam registradas, sem mexer
- `profiles` tem **colunas duplicadas**: `signo_solar` e `sign_sun`, `cycle_length` e
  `cycle_duration`. O codigo so usa as segundas. Limpar exige conferir se algo externo le as
  primeiras (o webhook acima, por exemplo).
- `profiles` tem **duas colunas apontando para auth.users** (`id` e `user_id`). O codigo usa
  `user_id`; o painel admin usa `id` em um lugar. Funciona porque guardam o mesmo valor.
- `service_requests` e `cycle_history` referenciam `profiles(id)`, nao `auth.users`.

### Arquivos
- `supabase/extrair-schema.sql` — a consulta, para repetir quando o banco mudar
- `supabase/migrations/00000000_schema_base.sql` — o retrato, com os problemas comentados
- `supabase/migrations/20260819_corrige_schema_base.sql` — as correcoes

**O banco agora e reproduzivel a partir do repositorio.**

## 2026-08-19 — Fase 3 (parte 3): mandala por plano, quadro dos sonhos e LGPD

Fecha a Fase 3. Todos os modulos centrais do documento existem agora.

### Insight ao fechar a lunacao (§8)
O documento traz um exemplo do que ele deve dizer: "seu humor esteve mais pesado nos dias 18
a 24, exatamente sua fase lutea, que coincidiu com a lua minguante. Seu sono foi melhor nos 7
dias apos a lua nova. Voce completou o habito em 19 dos 29 dias."

Isso e **leitura de dados, nao interpretacao** — entao e calculado, nao gerado. Sao fatos
sobre o que ela mesma registrou, e cada frase so aparece quando ha dado que a sustente:
- Trecho de humor baixo exige **tres dias seguidos**; dois dias ruins acontecem.
- A fase do ciclo so e mencionada quando o trecho inteiro esteve nela.
- "Sono melhor na lua X" exige pelo menos tres registros naquela fase e diferenca de meio
  ponto na media; abaixo disso e ruido.
- Com menos de sete dias registrados, nao ha insight nenhum: um retrato feito de tres dias
  diria mais sobre o acaso do que sobre ela.

### Mandala lunar por plano (§8)
- **Hecate**: lunacao atual, como antes. Ganhou um convite explicando o que o insight faz.
- **Isis**: o insight de fechamento.
- **Lilith**: soma o **comparativo com a lunacao anterior** e a **exportacao como imagem**
  (SVG desenhado em canvas e baixado como PNG, tudo no dispositivo dela).

A mandala tambem passou a gravar a fase do ciclo de cada dia, que e o que permite ao insight
dizer "exatamente na sua fase lutea".

O comparativo so aponta o que mudou de forma perceptivel, e **nao acusa**: piora vira "seu
humor pediu mais cuidado nesta lunacao", nunca "piorou".

### Quadro dos Sonhos (§6.14)
Tabela `dream_board` e tela em `/quadro-dos-sonhos`. **Nao se confunde com o diario de
sonhos**: aqui e o que ela quer atrair, la e o que ela sonhou dormindo.

As categorias sao as **dez areas da Roda da Vida**, que ela ja conhece do cadastro — o quadro
conversa com a roda em vez de inventar uma classificacao nova. Cada sonho pode ter uma
afirmacao associada, e marcar "aconteceu" move para uma secao propria, sem apagar.

### Direitos sobre os dados (§16, LGPD)
O documento determina que ciclo, humor, saude e emocao sao sensiveis e privados. Faltava o
outro lado: poder levar embora e poder apagar.

- **`exportar_meus_dados()`**: devolve tudo num JSON — perfil, check-ins, habitos, gratidoes,
  roda da vida, grimorio, intencoes e quadro dos sonhos. O arquivo e montado e baixado no
  proprio dispositivo; nao passa por outro servico no caminho.
- **`excluir_meus_dados()`**: apaga as treze tabelas de dados dela.
- Ambas `security definer` com `search_path` fixo, lendo apenas as linhas de quem chamou.
- Aparecem no Perfil, em linguagem de gente: "Baixar tudo que e meu".

**A exclusao exige escrever a palavra APAGAR**, nao um dialogo de confirmar que se clica sem
ler. A tela avisa que nao tem volta, sugere baixar a copia antes, e o botao fica desligado ate
a palavra conferir. 11 testes cobrem isso, incluindo que **nao desloga se a exclusao falhar** —
seria o pior desfecho possivel: ela sai achando que apagou, e os dados continuam la.

**Pendente**: a conta de acesso em si (`auth.users`) precisa de uma edge function com
service_role para ser removida. Os dados somem, mas o login continua existindo vazio ate isso
ser feito.

### Verificado
181 testes passando (eram 153) · tipos limpos · lint sem erros · build completo · as quatro
rotas novas existem e sao protegidas.

### Migration nova
`20260819_quadro_sonhos_lgpd.sql` — tabela `dream_board`, funcoes de exportacao e exclusao.

## 2026-08-19 — Fase 3 (parte 2): renovacao na segunda e Ceu da Semana

### Renovacao dos creditos: SEGUNDA-FEIRA
Decisao da Raquel, resolvendo a divergencia entre o documento (dizia sexta em dois lugares) e
o codigo (sempre contou a semana a partir de segunda). **O calculo nao mudou** — `getWeekStart`
ja devolvia segunda nas tres implementacoes. O que estava errado era o que rodava em volta:

- O aviso "seus creditos foram renovados" disparava na **sexta**. Passou para segunda 8h BRT.
- O aviso "voce ainda tem consultas" disparava na **quinta**, o que so fazia sentido com
  renovacao na sexta. Passou para **domingo**, vespera da renovacao, e o texto mudou de
  "nao deixe a semana passar" para "seus creditos renovam amanha".
- A tela de perfil dizia "Toda sexta-feira" ao lado da preferencia de notificacao.

**Cinco notificacoes usavam travessao**, que o §11 do documento proibe explicitamente.
Reescritas: hidratacao, cha do almoco, cha noturno, creditos sobrando e mudanca de fase lunar.

### Ceu da Semana (§6.5)
Existiam **duas telas inacabadas e sem rota** — `Sky.tsx` e `Oracle.tsx` — fazendo versoes
pobres da mesma coisa, e o Templo cobria parte disso em janelas modais. Agora ha uma tela so,
em `/ceu`, com as quatro coisas que o documento pede:

1. **Panorama dos transitos da semana**
2. **Orientacao dia a dia**, com o dia de hoje ja aberto e os demais a um toque
3. **Previsao para Sol, Lua e Ascendente** (o Templo mostrava so em modais separados)
4. **Alertas de transito sensivel** (Mercurio retrogrado, lua fora de curso, eclipses),
   no topo, porque e o que muda o dia dela

As duas telas orfas foram removidas: agora estao de fato substituidas, nao apenas guardadas.
O botao "Ceu da Semana" do Templo leva para a tela completa; o modal parcial saiu.

**O conteudo continua sendo publicado pela Raquel**, no painel. Nenhuma geracao automatica:
sao as leituras dela. O painel ganhou os tipos novos no mesmo seletor —
panorama, alerta (com campo para o nome do transito), dia a dia e por signo.

**Sem migration**: a tabela `horoscopes` ja aceita `sign` e `type` livres, entao os tipos
novos (`day_weekly`, `transit_alert`) entram sem alterar schema. **A confirmar no deploy**:
se houver algum CHECK constraint em `horoscopes.type` criado pelo painel do Supabase, a
publicacao dos tipos novos falha. O codigo atual ja grava valores livres (`ceu_semana`,
`aries`), o que sugere que nao ha, mas so da para confirmar rodando.

10 testes cobrem a tela, incluindo o risco central: **a leitura de um signo que nao e o dela
nao pode aparecer**. Tambem cobrem abrir no dia certo, usar a publicacao mais recente quando
ha repetida, e o convite a calcular o mapa quando ele ainda nao existe.

### Verificado
153 testes passando (eram 143) · tipos limpos · lint sem erros · build completo · `/ceu`
existe e e protegida.

### O que resta da Fase 3
- Insight ao fechar a lunacao e mandala lunar por plano (§8)
- Quadro dos sonhos (§6.14)
- Fluxo LGPD de exportacao e exclusao

## 2026-08-19 — Fase 3 (parte 1): dicas contextuais e diario de sonhos

Os dois maiores diferenciais do documento, e os unicos modulos centrais que nunca tinham
saido do papel.

### Sistema de dicas contextuais (§7)
Mensagem curta entregue quando o portal reconhece um padrao nos dados que a usuaria ja
registra. **Nao passa pela sacerdotisa**: o conteudo e o do documento, escrito pela Raquel.
Duas razoes — a regra de ouro e que a IA so fala a partir da base de conhecimento, e uma
dica que muda de texto a cada dia sairia cara e imprevisivel. A voz fica sempre a mesma.

- **Oito gatilhos** com as condicoes exatas do documento: sono <=2 por 2 dias, humor <=2 por
  2 dias, ansiedade, dor emocional relatada no texto, TPM/fase lutea, digestao, 3 dias sem
  movimento, 2 dias sem hidratacao.
- **Uma por dia, prioridade emocional > sono > corpo**, com registro em `contextual_tips`
  para que a dica do dia nao mude se a usuaria reabrir o app, e nao volte depois de lida.
- Aparece no Templo. **So aparece quando ha padrao**, o que na maioria dos dias nao acontece:
  uma mensagem que aparece todo dia deixa de ser notada.

**Duas adaptacoes**, por falta de dado no app:
1. "hidratacao abaixo de 60% da meta" virou "hidratacao nao marcada por dois dias" — o app
   registra o habito como sim ou nao, sem quantidade. Para valer a regra original seria
   preciso registrar ml, o que muda a tela de habitos.
2. O convite ao Ho'oponopono saiu das dicas de dor emocional, porque o modulo foi retirado
   do produto hoje. No lugar entrou o convite ao banho.

40 testes cobrem os gatilhos, a prioridade e o **tom de voz**: ha teste que reprova qualquer
dica que use "voce nao", "voce falhou" ou travessao, e teste que confere que todo convite
aponta para um modulo que existe.

### Diario de sonhos (§9)
O campo `dream_notes` ja existia no banco e na tela, sem nada em volta. Agora:

- **Registro completo no check-in matinal**: o texto livre, a emocao predominante e a
  intensidade (leve / marcante / perturbador). Emocao e intensidade so aparecem depois que ha
  algo escrito — perguntar antes seria ruido.
- **A lua e a fase do ciclo do dia ficam gravadas junto**, que e o que permite, meses depois,
  responder em que fase ela sonha mais.
- **Tela nova em `/sonhos`**: os simbolos que se repetem, a fase lunar predominante, a
  distribuicao de emocoes e o historico dos relatos.

**O reconhecimento de simbolos e por vocabulario, nao por IA** — 15 simbolos (agua, voo,
queda, perseguicao, casa, morte, bebe, animais, dentes, alguem do passado, viagem, luz,
escuridao, fogo, espelho). Mesmo motivo das dicas, mais um: uma contagem diz melhor o que
se repete do que uma leitura gerada a cada visita.

**A tela nao interpreta.** Nomeia o que voltou e mostra as datas; o significado quem constroi
e a usuaria, olhando o que estava vivendo naqueles dias. E o que o documento pede.

**Cuidado com afirmacao infundada**, que aqui e o risco real: um simbolo visto uma vez so nao
vira padrao, correlacao com a lua so e afirmada quando a fase se repete, e "voce sonha mais
na Lua X" exige pelo menos seis registros e nao aceita empate. Com menos que isso a tela diz
que ainda nao ha padrao, em vez de inventar um.

30 testes entre a logica e a tela. Dois pegaram erros meus enquanto eu escrevia:
- O dicionario nao reconhecia "chovia" nem "voava" (as conjugacoes listadas nao cobriam).
- O radical `nad` casava com **"nada"**: "nao lembro de nada" viraria simbolo de agua. Ha
  agora um teste especifico para frases banais.

### Verificado
143 testes passando (eram 66) · tipos limpos · lint sem erros · build completo · a rota
`/sonhos` existe e e protegida.

### Migration nova
`20260819_sonhos_e_dicas.sql` — colunas de sonho em `daily_checkins`, tabela
`contextual_tips` e indice parcial para a tela de padroes.

### Ainda desta fase, nao feito
- **Ceu da semana**: `Oracle.tsx` e `Sky.tsx` continuam sem rota. Sao o material da proxima
  entrega desta fase.
- **Insight ao fechar a lunacao** e **mandala lunar por plano** (§8).
- **Quadro dos sonhos** (§6.14).
- **Fluxo LGPD** de exportacao e exclusao de dados.
- **Renovacao dos creditos na sexta**: continua na segunda no codigo. Depende da decisao da
  Raquel — mexer nisso desloca a semana de todas as assinantes de uma vez.

## 2026-08-19 — Fase 2 da auditoria: fundacao tecnica

### Testes: de zero para 66
Instalado Vitest + Testing Library. Cobertura escrita para o que dói mais se quebrar:
- **`markdownSeguro`** (16 casos): script, img/onerror, iframe, svg/onload, href javascript:,
  tag de fechamento solta. Criterio do teste e que a saida nao contenha **nenhuma** tag alem
  de strong/h3/br. Se alguem mexer nessa funcao e o escape sair, o teste quebra.
- **`useSacerdotisaStream`** (8 casos): evento partido no meio entre dois pedacos do fluxo,
  erro anunciado pelo servidor, 429, rede fora, entrada vazia. Um teste verifica que o corpo
  enviado contem so `message` e `module` — ou seja, que o prompt nao voltou para o navegador.
- **`ErrorBoundary`** (4 casos): inclusive um que confere que a tela de erro nao culpa a
  usuaria nem expoe jargao, conforme §11 do documento.
- **`planLimits`** (17 casos): registra a decisao de 3x/semana para Isis e que os dois
  modulos removidos nao tem mais limite.
- **`mysticMath`** (21 casos): signos nas viradas, as quatro fases da lua, fases do ciclo,
  ciclo atrasado, duracao personalizada.

Um deles pegou erro meu, nao do codigo: eu tinha calculado a data errada no teste de ciclo.

### CI
`.github/workflows/ci.yml` roda tipos, lint, testes e build a cada push e PR na main.
Nao existia verificacao automatica nenhuma antes.

### Duplicacao: 721 linhas viraram 106
As quatro paginas de consulta (banho, florais, lei da atracao, relacionamento) eram copias
quase identicas, incluindo o leitor de eventos do fluxo, copiado literalmente em cada uma.
Agora sao configuracao: `<ConsultaModule>` (177 linhas) + `useSacerdotisaStream` (128).
Cada pagina tem ~26 linhas de dados.

Ganhos que vieram junto, porque agora ha um lugar so para corrigir:
- O leitor de fluxo passou a remontar eventos partidos entre dois pedacos. As sete copias
  antigas quebravam silenciosamente quando isso acontecia.
- A tela agora mostra "restam N consultas nesta semana".
- Falha ao salvar no grimorio deixou de ser silenciosa.
- A mensagem de limite virou o convite amoroso do §12 do documento, em vez de "🔒 Limite
  semanal atingido".

### Sessao unica
Novo `AuthProvider`. Antes eram 34 chamadas de `getSession()` em 25 arquivos, e
`onAuthStateChange` **nao era usado em lugar nenhum**: token expirado ou logout em outra aba
nao chegavam a interface. Os cinco hooks de negocio migraram; restam 24 chamadas diretas nas
paginas, que sao a proxima leva.

### Rede de seguranca
`ErrorBoundary` na raiz. Antes, um erro de renderizacao em qualquer tela deixava a usuaria
diante de uma pagina em branco, sem explicacao e sem saida.

### Pacote inicial: 1.262 KB -> 472 KB
Todas as telas viravam um arquivo unico, baixado inteiro por quem abrisse a home no celular.
Agora cada rota carrega quando e aberta, e o three.js (496 KB, so o fundo animado da landing)
virou pedaco a parte que chega depois do texto.

### Tipos
Os 16 `any` do front foram embora. Como `supabase gen types` exige o projeto ligado a CLI,
os tipos das tabelas que faltavam foram escritos a mao em `types.ts` a partir das migrations
e do uso real. O `tsc` pegou dois bugs reais no caminho: acesso a `profileData` sem checar
nulo em MatrizDestinoPage, e `subscription_status` opcional passado onde se exigia string.

### Lint: 111 problemas -> 0 erros
- `MatrizMandala`: o componente do circulo era definido dentro do render e recriado a cada
  atualizacao, remontando os 29 circulos. Movido para o modulo (29 erros de uma vez).
- Edge functions saem do lint do front: rodam em Deno, com outros globais, e o `@ts-ignore`
  do import npm e a forma correta ali.
- `AuthContext` dividido em tres arquivos (contexto, provider, hook) para o fast refresh.
- Duas regras do React Compiler (`set-state-in-effect`, `immutability`) ficaram como **aviso**,
  com justificativa no proprio arquivo de configuracao: apontam padroes que funcionam no
  React 19 sem o compiler, e a correcao estrutural de uma delas e adotar TanStack Query.
  Restam 35 avisos, visiveis e nao bloqueantes.

### Limpeza
Removidos `App.css`, `react.svg`, `NumerologySection.tsx` (254 linhas, duplicava a pagina de
Numerologia) e tres dependencias declaradas e nunca usadas (`react-big-calendar`,
`card-validator`, `react-icons`).

**`Oracle.tsx` e `Sky.tsx` foram mantidos de proposito**, mesmo sem rota: sao as telas do Ceu
da Semana, modulo da Fase 3. Apagar seria jogar fora trabalho ja feito.

### Nao feito, e por que
- **TanStack Query**: estava no roadmap desta fase. O `AuthProvider` resolveu a maior parte
  da duplicacao de sessao, e adotar a biblioteca agora significaria reescrever o carregamento
  de dados de 20 telas de uma vez. Fica para quando a Fase 3 mexer nelas de todo modo.
- **Dump do schema e `supabase gen types`**: exigem o projeto ligado a CLI, o que precisa das
  credenciais da Raquel. As seis tabelas centrais (`profiles`, `horoscopes`, `daily_insights`,
  `rituals`, `services_catalog`, `service_requests`) continuam sem migration, entao o banco
  ainda nao e reproduzivel a partir do repositorio. Comandos:
  `supabase link --project-ref <ref>` e depois `supabase db dump -f supabase/migrations/00000000_schema_base.sql`
  e `supabase gen types typescript --linked > src/database.types.ts`.
- **Sentry**: exige conta e DSN. O `ErrorBoundary` ja tem o ponto unico onde o envio entra.

### Verificado
`pnpm typecheck` limpo · `pnpm lint` sem erros · `pnpm test` 66 passando · `pnpm build`
completo com service worker · no navegador, landing carrega e o canvas chega depois, rotas
privadas e /admin redirecionam sem sessao, console limpo.

## 2026-08-19 — Decisoes de produto da Raquel

Tres pontos que estavam listados como "a decidir" na auditoria foram resolvidos por ela
hoje e implementados na sequencia.

### Lei da Atracao no plano Isis: 3x por semana
O documento se contradizia (tabela da §4 dizia 3x, cabecalho da §6.14 dizia 2x). Vale 3x.
O codigo ja estava assim; agora `module_limits` registra a decisao com a data no comentario,
em vez de "reproduz o comportamento atual".

### Ho'oponopono e Crianca Interior saem do produto
Removidos: as duas telas (`Hooponopono.tsx`, `CriancaInterior.tsx`), as rotas
`/hooponopono` e `/crianca-interior`, as entradas no catalogo de praticas, os prompts no
servidor e os limites em `module_limits` e `planLimits.ts`.

**Mantido de proposito:**
- **As respostas ja salvas no Grimorio das usuarias.** `Rituals.tsx` le
  `sacerdotisa_history` sem filtrar por modulo, entao quem salvou uma consulta desses
  dois continua vendo normalmente. Apagar seria perda irreversivel de algo que e delas.
- **As categorias `hooponopono` e `crianca_interior` da base de conhecimento.** Tirar o
  modulo nao e apagar o conhecimento: se houver material ingerido nessas categorias, a
  Sacerdotisa continua podendo usa-lo no chat livre. As opcoes seguem no painel de
  ingestao. Se a intencao for remover tambem o conteudo, e uma decisao separada.

O portal fica com quatro modulos de consulta com credito: banho personalizado, florais,
lei da atracao e relacionamento.

### Notificacoes com horario escolhido pela usuaria
O documento (§10) promete horarios personalizaveis. A tela de perfil ja deixava escolher
e o banco ja guardava em `morning_time`/`evening_time` desde junho — as colunas nunca
eram lidas. O disparo era em horario fixo UTC para todas.

Agora:
- Os dois check-ins rodam **de 15 em 15 minutos** e a funcao seleciona quem pediu para ser
  avisada naquela janela, em horario de Brasilia (`Intl` com `America/Sao_Paulo`, entao
  acompanha horario de verao se voltar a existir).
- Quem nunca mexeu nas preferencias recebe nos padroes 07:00 e 21:00.
- Nova tabela `notification_sends` impede envio repetido quando o cron atrasa ou e
  reexecutado; faxina diaria mantem so os ultimos 7 dias.
- Os demais nove tipos seguem em horario fixo, que e o que o documento descreve para eles.

Testado: 17 casos de borda da janela (cron atrasado, virada de meia-noite, valor invalido,
hora sem zero a esquerda) e a varredura dos 1.440 horarios possiveis do dia, cada um
coberto exatamente uma vez.

### Ainda em aberto
A renovacao dos creditos continua na **segunda-feira** no codigo e **sexta-feira** no
documento. Nao foi tocada: depende de decisao da Raquel, e mexer nisso desloca a semana
de todas as assinantes de uma vez.

### Migration nova
`20260819_notificacoes_personalizadas.sql` — precisa dos mesmos tres valores substituidos
da migration de cron, e roda **depois** dela.

## 2026-08-19 — Fase 1 da auditoria: seguranca critica

Fecha os seis criticos e os altos da auditoria. **Nada disso vale sem deploy**: as
migrations e as edge functions precisam ir para producao, e tres secrets novos
precisam existir (ver "Antes do deploy" no fim desta entrada).

### Receita
- **Preco do checkout agora vem do banco** (`asaas-checkout`): o `amount` chegava
  no corpo da requisicao e era cobrado como veio. Dava para pedir `lilith_anual` e
  mandar `amount: 0.01`. Agora o servidor le `plan_configs` pelo `plan_id` e ignora
  o que o cliente manda; o `user_id` tambem passou a vir do token, nao do corpo.
- **Webhook Asaas fail-closed + idempotencia** (`asaas-webhook`): a checagem era
  `if (expectedToken && ...)`, ou seja, sumia se o secret nao estivesse configurado.
  Agora recusa com 503 sem o secret, confirma na API do Asaas que a cobranca esta
  paga antes de ativar, e registra o evento em `webhook_events` (chave primaria =
  id do evento) para nao reprocessar reentregas. Quando o pagamento nao confirma, o
  registro e liberado para que a reentrega legitima ainda funcione.
- **Creditos deixam de ser controlados pelo navegador**: o parametro `module`
  chegava na edge function e nunca era usado; os limites viviam em `planLimits.ts`.
  Alem disso a RLS `for all` deixava a usuaria dar `update plan_credits set used = 0`.
  Agora existe `module_limits` no banco, `consume_module_credit()` confere e debita
  na mesma transacao, `refund_module_credit()` estorna se o modelo falhar, e a RLS
  da a usuaria apenas leitura. `usePlanCredit.increment()` virou `refresh()`.

### Acesso
- **Todas as edge functions passaram a verificar quem chama** (novo `_shared/auth.ts`):
  `ingest-knowledge`/`ingest-bulk`/`send-push`/`scheduled-notifications` exigem admin
  ou o segredo interno; `calculate-astral-chart` exige a propria usuaria; `asaas-checkout`
  exige sessao. Antes so a `sacerdotisa` verificava.
- **`knowledge_base` deixou de ser legivel por anonimo** (a policy era `using (true)`).
- **`/admin` ganhou guard de rota** (`AdminGuard`): o painel checava o papel dentro de
  si mesmo, depois de ja ter disparado sete fetches.
- **`SubscriptionGuard` bloqueia visitante anonima**: `isExpired` continuava `false`
  sem sessao, entao o guard so barrava inadimplencia. Novo campo `isAuthenticated`.
- **URL do push restrita a caminhos internos**: o service worker abre `data.url` sem
  validar, e a funcao aceitava qualquer URL de quem quisesse chamar.

### Sacerdotisa
- **Prompts saíram do navegador** (novo `_shared/prompts.ts`): as seis telas montavam
  a instrucao inteira e mandavam como `message`, que ia crua para o modelo. Pelo
  DevTools dava para trocar o texto e derrubar as duas regras de ouro (responder so
  a partir da base, nunca revelar ser IA). Agora o cliente manda so o que a usuaria
  escreveu, com teto de 2.000 caracteres.
- **Aviso de saude passou a valer para os seis modulos** (§16 do documento). Estava
  so no prompt de Florais.
- **Contexto vem do banco**: signos, fase do ciclo e fase lunar eram calculados no
  navegador e enviados. Fase lunar e do ciclo portadas para `_shared/ciclos.ts`.
- **XSS fechado** (`markdownSeguro.ts`): as seis telas jogavam a resposta do modelo
  no DOM via `dangerouslySetInnerHTML` sem sanitizar. Como a resposta e influenciavel
  pelo conteudo da base, era explorável. Agora o texto e escapado antes de formatar.
  Testado com script, img/onerror, iframe, svg/onload e href javascript:.
- **Prompt caching corrigido**: o `cache_control` cobria um bloco unico que incluia o
  RAG e o contexto, que mudam a cada consulta, entao o prefixo nunca se repetia e nao
  havia acerto nenhum. Separado em bloco estavel (persona + regras, cacheado) e bloco
  volatil. O commit `ba51a1e` nao entregava a economia pretendida.
- **Streaming com try/catch**: falha no meio deixava o controller aberto e a tela
  esperando para sempre.
- **Fallback do RAG consertado**: usava `.textSearch` com 50 caracteres de texto livre,
  que o `to_tsquery` rejeita, dentro de um `catch {}` vazio que escondia o erro real.

### Notificacoes
- Paginacao de 1.000 em 1.000 (o PostgREST cortava em 1.000 e parte da base parava de
  receber em silencio) e envio em lotes de 100.
- **Opt-out estava invertido**: buscava quem tinha a preferencia como `true` e, se a
  lista viesse vazia, mandava para todos. Quem desmarcava continuava recebendo.
  Agora e o contrario: sem linha salva recebe, com a linha em `false` nao recebe.

### Achados corrigidos no caminho
- **`pnpm build` estava quebrado**: `workbox-precaching` e usado em `src/sw.ts` e nao
  estava no `package.json`. Funcionava com npm por hoisting (o que o Dockerfile usa),
  quebrava com pnpm. Declarado como devDependency.
- **Dockerfile pulava o `tsc` de proposito** ("trava com erros"), publicando imagem
  com codigo que nao compilava. Os erros foram corrigidos e `npm run build` voltou.
- **`getMoonPhase` nunca retornava `dayOfCycle`**, mas `MandalaDoMes` exibia o valor:
  a tela mostrava "Dia undefined do ciclo lunar". Corrigido.
- Imports mortos removidos; lint caiu de 111 para 91 problemas.

### Verificado
`pnpm build` completo (tsc + vite + service worker) passa; `tsc -b` limpo pela primeira
vez; sintaxe das oito edge functions checada; sanitizacao testada com oito casos;
no navegador, `/templo`, `/florais` e `/admin` redirecionam para `/portal` sem sessao
e o painel admin nao monta.

### Antes do deploy (obrigatorio)
1. `supabase secrets set INTERNAL_TASK_SECRET="<valor aleatorio longo>"`
2. `supabase secrets set ASAAS_WEBHOOK_TOKEN="<o token configurado no painel Asaas>"`
   — sem ele o webhook passa a recusar tudo com 503, de proposito.
3. `supabase secrets set ALLOWED_ORIGINS="https://<dominio>"` (opcional; sem a variavel
   o CORS segue em `*`, como era antes).
4. Rodar `20260819_fase1_seguranca.sql` e depois `20260819_cron_segredo_interno.sql`
   (esta ultima exige substituir `<PROJECT_REF>`, `<SERVICE_KEY>` e `<INTERNAL_SECRET>`).
   Sem a segunda, as notificacoes agendadas param de sair.
5. Redeploy das oito edge functions (todas mudaram, direta ou indiretamente).

### Em aberto
- **RLS de `profiles` nao foi versionada**: a tabela ja tem RLS ligada e 4 politicas
  criadas pelo painel. Nao foram tocadas justamente por estarem em uso. Falta ler o
  conteudo delas (`pg_policies`) e traze-las para o repositorio. O abuso mais grave
  ja esta fechado pelo trigger `protect_profile_columns`.
- **Limites em duas fontes**: `module_limits` (banco, decide) e `planLimits.ts`
  (navegador, so exibe). Unificar e a tarefa G2.
- **O documento se contradiz** sobre lei_atracao, hooponopono e crianca_interior no
  plano Isis: a tabela da §4 diz 3x/semana, os cabecalhos das secoes 6.14/6.16/6.17
  dizem 2x. `module_limits` reproduz o comportamento atual do codigo (3, 2 e 2)
  para nao mudar regra de negocio sozinho. Precisa da decisao da Raquel.
- Cartao ainda trafega pelo app (escopo PCI) e os ~44 campos fora do `.input-mystic`
  seguem com contorno fraco. Ambos permanecem para as fases seguintes.

## 2026-08-19 — Paleta alinhada ao documento (§13 Identidade Visual)

- Decisao da Raquel: o **codigo se ajusta ao PDF**, nao o contrario. As 5 cores nomeadas no documento entraram com hex exato em `tailwind.config.js`: Noite sagrada `#2E1F5E` (era `#1C0A38`), Violeta sacerdotisa `#8B5CF6` (era `#8B1FC8`), Dourado lunar `#C9A84C` (era `#C5A059`), Creme `#F5F0E8` e Rosa ciclico `#D4A5C9` (esses dois ja batiam). Fontes ja estavam 100% corretas.
- Tons auxiliares (card, card2, border, deep, text, muted) foram **derivados** da nova Noite sagrada e validados em contraste WCAG 2.2 AA — cada um documentado com o ratio no proprio config.
- Dois tokens novos porque o violeta do documento e mais claro que o antigo: `accent-deep #7A46E8` para botao solido com texto branco (5.43:1 — o `#8B5CF6` puro dava 4.23 e reprovava) e `accent-soft #A78BFA` para violeta usado como texto. Aplicado nos 4 botoes solidos (`InstallPWAModal`, `Register` x2, balao do chat em `Sacerdotisa`).
- Hex cru eliminado do `src/`: `#0F0518` (~40 usos) virou token `deep`, `#2a1245`/`#200940`/`#1a0b2e` viraram `card2`. Atualizados tambem `index.css` (scrollbar, selection, shimmer, glows), manifest do PWA em `vite.config.ts` (`theme_color`/`background_color`) e as cores de identidade em `MatrizMandala`, `RodaDaVida`, `Retrospectiva`, `MagiaLunar` — as cores semanticas do diagrama da matriz (verde/vermelho/azul/ambar) foram mantidas.
- **Correcao adjacente**: `.input-mystic` usava `bg-netzach-bg`, o mesmo fundo da pagina, e a borda dava 1.57:1 contra ela — abaixo do minimo de 3:1 do WCAG 1.4.11. Ja falhava antes (1.68:1), a paleta nova so tornou visivel. Agora o campo afunda em `deep` e usa `border-field #8674C6` (3.61:1).
- Verificado com o dev server rodando: fundo `#2E1F5E` e titulos `#C9A84C` aplicados; varredura automatica de contraste em `/`, `/portal`, `/iniciacao` e `/assinar` = **0 falhas**; `npx vite build` compila o app; lint identico ao baseline (111 problemas pre-existentes, nenhum novo).
- **Pendencias descobertas no caminho**: (1) `pnpm build` quebra no service worker — `workbox-precaching` e usado em `src/sw.ts` mas nao esta declarado no `package.json`; funciona com npm por hoisting (que e o que o Dockerfile usa), quebra com pnpm. (2) `.claude/launch.json` apontava para a porta 5175 e o Vite serve em 5174 — corrigido. (3) Os ~44 campos de formulario que nao usam `.input-mystic` (majoritariamente `AdminPanel`) continuam com contorno fraco; migra-los faz parte da limpeza F1/F5 da auditoria.
- Taro semanal: **mantido fora de escopo por ora**, por decisao da Raquel.
- Criado `.env` local com valores placeholder so para o dev server subir (gitignored) — **precisa ser preenchido com as credenciais reais do Supabase**.

## 2026-08-19 — Auditoria PDF x codigo (pendencia #1 concluida)

- Auditoria completa do documento oficial (24 pags) contra o codigo no commit `ee98ed7`. Relatorio publicado como artifact: https://claude.ai/code/artifact/5851c60a-8baa-43c0-937d-496713817a2b
- **6 criticos** (receita/PI): preco da assinatura vem do body em `asaas-checkout:69` sem conferir `plan_configs`; webhook Asaas fail-open em `asaas-webhook:19-23` e sem idempotencia; `ingest-knowledge`/`ingest-bulk` sem auth = RAG poisoning direto no system prompt; RLS `for all` deixa a usuaria zerar `plan_credits`/`sacerdotisa_usage` e o param `module` nunca e usado no servidor; `send-push`/`scheduled-notifications` sem auth (push arbitrario p/ toda a base); `knowledge_base` com policy `using (true)` = acervo publico.
- **6 altos**: cartao em texto puro pelo app (escopo PCI); `SubscriptionGuard` nao bloqueia anonimos (`useSubscription.ts:40-43`) e `/admin` fora de guard; `dangerouslySetInnerHTML` sem sanitizacao nas 6 paginas de consulta; prompts montados no client; `calculate-astral-chart` e checkout aceitam `user_id` do body; `AdminPanel.tsx:160` faz `select *` em `profiles` com anon key.
- **Gaps vs. spec**: ausentes — dicas contextuais (§7), diario de sonhos (§9), taro semanal com escolha cega (§6.6), insight de lunacao (§8); parciais — quadro dos sonhos, ceu da semana (`Sky.tsx`/`Oracle.tsx` orfaos). Divergencias: creditos renovam segunda e nao sexta (3 impls de `getWeekStart`); limites de plano em 3 fontes que discordam; `morning_time`/`evening_time` existem e nunca sao lidos; aviso de saude so em `Florais.tsx:55` (1 de 6 modulos); mandala lunar nao diferencia por plano.
- **IA/custo**: chat sem memoria (cada turno isolado, `sacerdotisa/index.ts:296`); prompt caching do commit `ba51a1e` nao gera acerto (bloco system unico com RAG volatil, estatico abaixo dos 2048 tokens do Haiku); credito debitado antes da chamada; stream sem try/catch; fallback `.textSearch` quebrado com catch vazio.
- **Qualidade**: Dockerfile pula o `tsc` de proposito (`Dockerfile:12-15`) — producao nao compila; zero testes e zero CI; erros do Supabase descartados em massa (UI mostra "salvo" com escrita falhando); migrations nao reproduzem o banco (faltam `profiles`, `horoscopes`, `daily_insights`, `rituals`; `schema_dump.sql` vazio); ~1.070 linhas duplicadas nas 6 paginas de consulta.
- **Confirmar com a Raquel antes de virar tarefa**: policy real de `profiles` no dashboard; se a paleta mais escura (#1C0A38/#C5A059/#8B1FC8 vs. spec #2E1F5E/#C9A84C/#8B5CF6) foi decisao de design — nesse caso atualizar o PDF, nao o codigo; se o taro semanal e backlog ou escopo cortado (depende de rotina manual semanal dela).
- Roadmap proposto em 4 fases: (1) fechar as portas abertas, (2) recolocar o chao tecnico, (3) alinhar com o documento, (4) afinar a sacerdotisa. Nenhuma alteracao de codigo feita nesta sessao.

## 2026-08-18 — Squad dev instalado

- Squad dev do workspace instalado em `.claude/agents/` (12 agentes, cópias da fonte de verdade `C:\Users\raque\dev\.claude\agents\`) + `CLAUDE.md` do projeto criado com a stack REAL (Vite 7 + React 19 SPA, Tailwind v3, Supabase direto + Edge Functions Deno, Asaas, PWA com push) e as adaptações obrigatórias por agente — o app NÃO segue o padrão Next.js do workspace.
- Documento oficial do produto copiado para `.claude/references/Netzach-Documento-Completo.pdf`.
- **Estado do app encontrado** (pré-squad, autoria anterior): 27 páginas cobrindo a maior parte dos módulos do PDF; Sacerdotisa (chat IA Claude + RAG pgvector com personas por plano); sistema de créditos por plano (hecate/isis/lilith) com renovação às sextas; push notifications (subscriptions + cron + send); pagamentos Asaas (checkout + webhook); 14 migrations.
- **Divergências PDF × código registradas no CLAUDE.md** (paleta do manifest, limites de créditos do chat, cobertura de módulos) — resolver com a Raquel antes de qualquer "correção".
- Pendências sugeridas para as primeiras sessões do squad: (1) auditoria módulo a módulo PDF × código; (2) revisão de RLS nas tabelas de dados sensíveis (ciclo/humor/sonhos); (3) teste real da PWA instalada (push + offline) em Android; (4) validação do fluxo Asaas ponta a ponta em sandbox; (5) README real substituindo o template do Vite.

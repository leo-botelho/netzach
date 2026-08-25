# Emails do Netzach — Resend + Supabase

Guia para deixar os emails do app saindo com a identidade visual do Netzach:
confirmação de cadastro, recuperação de senha, convite e troca de email.

São quatro etapas. A ordem importa: sem o domínio verificado no Resend, o SMTP
do Supabase não conecta.

---

## Por que trocar o envio padrão

O Supabase manda emails por conta própria, mas só para você testar: são **2
emails por hora**, e eles mesmos avisam que esse serviço não deve ser usado em
produção. Com trinta assinantes se cadastrando no mesmo dia, a maioria
simplesmente não recebe nada.

O Resend resolve isso e ainda entrega três coisas que importam: domínio
próprio no remetente (`sacerdotisa@seudominio.com.br`, não um endereço
genérico), registro de tudo que foi enviado, e 3.000 emails por mês no plano
gratuito.

---

## Etapa 1 — Resend: conta e domínio

### 1.1 Criar a conta

Em [resend.com](https://resend.com), criar a conta com o email da Raquel.

### 1.2 Adicionar o domínio

**Domains → Add Domain**. Digite o domínio do app (por exemplo
`netzach.app.br`).

O Resend sugere usar um subdomínio, tipo `mail.netzach.app.br`. Vale a pena:
se um dia um email de sistema for marcado como spam, isso não contamina a
reputação do domínio principal que você usa para falar com as pessoas.

Escolha a região **São Paulo (sa-east-1)** se a opção aparecer — mesma região
do banco, menos distância para o email percorrer.

### 1.3 Os registros de DNS

O Resend mostra de 3 a 4 registros. Eles vão no painel de onde o domínio foi
registrado (Registro.br, GoDaddy, Cloudflare, Hostinger — onde quer que seja).

| Tipo | Para que serve |
|------|----------------|
| **MX** | Recebe as respostas automáticas dos servidores de destino |
| **TXT (SPF)** | Declara que o Resend tem permissão de enviar em nome do seu domínio |
| **TXT/CNAME (DKIM)** | Assina cada email com uma chave — prova que não foi forjado |
| **TXT (DMARC)** | Diz o que fazer com email que falhar nas checagens acima |

Copie e cole exatamente como aparece. Dois cuidados que derrubam a maioria das
tentativas:

- Alguns painéis completam o domínio sozinhos. Se o Resend pede o nome
  `resend._domainkey` e o painel mostra `resend._domainkey.netzach.app.br`
  depois de salvar, está certo. Se você colar o nome completo e ele virar
  `resend._domainkey.netzach.app.br.netzach.app.br`, está errado.
- No campo de valor, nada de espaço sobrando no fim.

Depois de salvar, volte ao Resend e clique em **Verify**. Costuma levar de
poucos minutos a algumas horas — é o tempo que o DNS leva para se espalhar.
Enquanto não ficar verde, não siga adiante.

### 1.4 A chave de API

**API Keys → Create API Key**.

- Nome: `netzach-supabase`
- Permissão: **Sending access** (só enviar — não precisa de mais que isso)
- Domínio: o que você acabou de verificar

A chave aparece **uma vez só**. Guarde no gerenciador de senhas antes de
fechar a janela. Ela começa com `re_`.

---

## Etapa 2 — Supabase: ligar o SMTP

No painel do projeto: **Authentication → Emails → SMTP Settings**.

Ligue **Enable Custom SMTP** e preencha:

| Campo | Valor |
|-------|-------|
| Sender email | `sacerdotisa@mail.netzach.app.br` (o domínio verificado) |
| Sender name | `Netzach` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Username | `resend` |
| Password | a chave `re_...` da etapa 1.4 |

Sim, o usuário é literalmente a palavra `resend` — não é o seu email.

Sobre a porta: 465 é conexão criptografada desde o primeiro byte. A 587
também funciona (começa aberta e sobe para criptografada durante a conversa),
mas alguns provedores de nuvem bloqueiam a 587 para conter spam. Comece pela
465.

### Ajustar o limite de envio

Ainda em **Authentication → Rate Limits**, o campo *Rate limit for sending
emails* vem com 30 por hora. Com o SMTP próprio esse número é seu — suba para
algo folgado, como 200.

---

## Etapa 3 — Os endereços de retorno

Sem isto, o link de recuperação de senha chega no email mas não abre a tela
certa. É a configuração que mais gera confusão.

**Authentication → URL Configuration**:

- **Site URL**: `https://netzach.app.br` — o endereço atual do app, sem barra
  no fim
- **Redirect URLs**: uma por linha, com curinga —
  - `https://netzach.app.br/**`
  - `https://*.netzach.pages.dev/**` *(as prévias do Cloudflare)*
  - `http://localhost:5174/**` *(para testar na sua máquina)*
  - `https://app.raquelbasan.com.br/**` *(endereço antigo, ainda responde)*

O Supabase só redireciona para endereços que estão nessa lista. Qualquer outro
ele ignora e joga a pessoa na Site URL — e a Site URL não é a tela de trocar
senha.

**Todo domínio que serve o app precisa estar aqui, inclusive os antigos.** O
app monta o destino a partir da aba onde a pessoa está
(`window.location.origin`), então quem entra por um endereço fora da lista
gera um destino que o Supabase recusa — e vai parar na Site URL, às vezes num
domínio que nem reconhece. Endereço velho que continua no ar continua sendo
usado, por link salvo ou favorito antigo.

Use `/**` no fim em vez de escrever `/nova-senha`, e as prévias do Cloudflare
ficam cobertas de uma vez: cada uma ganha um código novo, listar uma a uma é
trabalho sem fim.

### Descobrir para onde o Supabase manda, sem gastar um email

Este comando pergunta ao endpoint com um token inventado. O token não vale
nada, então nada é consumido: o que interessa é o cabeçalho `Location` da
resposta.

Troque `SEU-PROJETO` pelo identificador que aparece em **Project Settings →
API**, no campo *Project URL* (é o mesmo que está no `.env`, em
`VITE_SUPABASE_URL`).

```bash
curl -s -o /dev/null -D - "https://SEU-PROJETO.supabase.co/auth/v1/verify?token=falso&type=recovery&redirect_to=https%3A%2F%2Fnetzach.app.br%2Fnova-senha" | grep -i location
```

Se o `Location` mantiver `/nova-senha`, o endereço está aceito na lista. Se
vier a Site URL pelada, aquele destino foi recusado. Troque o valor de
`redirect_to=` para testar os outros domínios.

### Validade do link

Em **Authentication → Providers → Email**, o campo *Email OTP Expiration*
controla quanto tempo o link vale. O padrão de 3600 segundos (uma hora) é o
que as telas do app dizem à usuária: *"o link vale por uma hora"*. Se mudar
aqui, mude o texto em `src/pages/EsqueciSenha.tsx` e `src/pages/NovaSenha.tsx`.

---

## Etapa 4 — Colar os templates

**Authentication → Emails → Templates**. Cada aba tem um campo de assunto e um
de HTML. Apague o conteúdo de fábrica e cole o arquivo inteiro.

| Aba no Supabase | Arquivo | Assunto sugerido |
|-----------------|---------|------------------|
| Confirm signup | `supabase/templates/confirmar-cadastro.html` | Bem-vinda ao Netzach ✦ |
| Reset password | `supabase/templates/redefinir-senha.html` | Seu caminho de volta ao Netzach |
| Magic Link | `supabase/templates/link-magico.html` | Sua entrada está aberta ✦ |
| Change email address | `supabase/templates/trocar-email.html` | Confirme seu novo endereço |
| Invite user | `supabase/templates/convite.html` | Você foi convidada ao Netzach ✦ |

O `_base.html` **não vai para o painel**. É o molde de onde os cinco saíram,
guardado para quando você precisar criar um email novo no mesmo estilo.

### O que não mexer

Dentro do HTML existem trechos assim:

```
{{ .ConfirmationURL }}
```

São etiquetas que o Supabase troca pelo link real na hora de enviar. Se apagar
ou escrever diferente, o botão do email não leva a lugar nenhum. Os usados
aqui:

- `{{ .ConfirmationURL }}` — o link, nos cinco templates
- `{{ .Email }}` e `{{ .NewEmail }}` — endereço antigo e novo, só na troca de email

---

## Testar

1. **Authentication → Emails → Templates**, botão **Send test email** em
   qualquer aba. Chegou com o fundo violeta e o botão dourado? SMTP e template
   estão de pé.
2. No app, `/esqueci-senha`: peça o link com seu email real.
3. Abra o email e clique. Tem que cair em `/nova-senha` com o formulário
   pronto — não na home.
4. Troque a senha e confirme que entra com ela.
5. Abra o mesmo link do email de novo: agora tem que aparecer *"Este caminho já
   se fechou"*. Link de recuperação vale uma vez só.

---

## Quando algo não funciona

| Sintoma | Onde olhar |
|---------|-----------|
| Email não chega | **Resend → Logs**. Sem registro nenhum, o Supabase não conseguiu conectar: confira usuário (`resend`) e senha (a chave inteira, com o `re_`) |
| Chega na caixa de spam | Domínio verificado no Resend? Os registros todos verdes? DMARC ausente pesa contra |
| `Error sending recovery email` | Limite por hora estourado, ou o SMTP não está salvo |
| Link abre a home, não `/nova-senha` | O destino não passou na lista de **Redirect URLs** e o Supabase usou a Site URL, sem erro nenhum. Repare **de qual domínio** você pediu a redefinição: o app usa o endereço da aba atual. Foi o que aconteceu em 25/08/2026 — o pedido saiu de `app.raquelbasan.com.br`, o endereço antigo que ainda responde e nunca esteve na lista, e o link caiu na Site URL. Copie o endereço do botão do email e olhe o `redirect_to=`: ele mostra o destino que ficou gravado |
| "Este caminho já se fechou" logo de cara | O link já foi usado, ou passou de uma hora. Alguns antivírus corporativos abrem os links do email antes de você — o que consome o link |
| Layout quebrado no Gmail | Só acontece se o HTML for editado com `<style>` no topo ou flexbox. Os cinco arquivos usam tabela e estilo em cada tag justamente por isso |

---

## Sobre o visual dos emails

Email não é página web. O Gmail apaga folha de estilo do cabeçalho, o Outlook
desenha com o motor do Word, e nenhum dos dois entende flexbox nem grid. Por
isso os arquivos são feitos de tabelas aninhadas com o estilo escrito em cada
tag — deselegante de ler, e o único jeito de aparecer igual em todo lugar.

A fonte Cormorant Garamond não carrega na maioria dos clientes de email. Todo
título traz Georgia como reserva: existe em qualquer sistema e tem o mesmo ar
cerimonial.

Paleta usada, a mesma do documento do produto:

| Cor | Onde | Contraste no cartão |
|-----|------|---------------------|
| `#1B1238` | fundo externo | — |
| `#2E1F5E` | cartão | — |
| `#4E3A8E` | bordas | — |
| `#C9A84C` | marca, títulos, botão | 6,23:1 |
| `#EFE6F7` | texto corrido | 11,76:1 |
| `#A294C2` | rodapé e apoio | 5,12:1 |

Todas passam no mínimo de acessibilidade (4,5:1 para texto corrido, 3:1 para
títulos grandes).

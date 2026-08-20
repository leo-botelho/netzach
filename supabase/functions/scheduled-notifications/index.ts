// @ts-ignore
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, servico, erro, exigirAdmin, segredoInternoValido } from '../_shared/auth.ts';

/**
 * Tipos de notificação agendada conforme documento Netzach:
 *
 * morning_checkin   — 7h (personalizável) — convite check-in matinal
 * hydration         — 10h, 14h, 16h       — lembrete de água
 * lunch_tea         — 13h                 — chá digestivo
 * evening_checkin   — 21h (personalizável)— check-in noturno
 * night_tea         — 21h30               — chá calmante
 * weekly_tarot      — sábado 9h           — tiragem pronta
 * credits_renewed   — segunda-feira       — créditos renovados
 * credits_unused    — domingo             — créditos sobrando
 * lunar_phase       — na mudança de fase  — orientação da nova fase
 * monthly_retro     — dia 1 do mês        — retrospectiva pronta
 * monthly_wheel     — dia 2 do mês        — atualizar roda da vida
 */

/**
 * Tipos cujo horário a usuária escolhe no perfil. O cron dispara em
 * janelas curtas e a função seleciona quem pediu para ser avisada
 * naquele intervalo, em horário de Brasília.
 *
 * O documento (§10) promete horários personalizáveis. As colunas já
 * existiam em notification_preferences e nunca eram lidas: o disparo
 * era em horário fixo UTC para todo mundo.
 */
const HORARIO_PROPRIO: Record<string, 'morning_time' | 'evening_time'> = {
  morning_checkin: 'morning_time',
  evening_checkin: 'evening_time',
};

const PADRAO_HORARIO: Record<string, string> = {
  morning_time: '07:00',
  evening_time: '21:00',
};

/** Largura da janela do cron, em minutos. Precisa bater com o agendamento. */
const JANELA_MIN = 15;

const emSaoPaulo = (opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', ...opcoes });

/** "HH:MM" agora, em horário de Brasília. */
function horaLocalAgora(): string {
  const partes = emSaoPaulo({ hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date());
  const h = partes.find(p => p.type === 'hour')?.value ?? '00';
  const m = partes.find(p => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

/** "AAAA-MM-DD" de hoje em Brasília, para não repetir o envio no mesmo dia. */
function dataLocalHoje(): string {
  return emSaoPaulo({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const paraMinutos = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** O horário escolhido cai na janela que está sendo disparada agora? */
function dentroDaJanela(escolhido: string, agora: string): boolean {
  const alvo = paraMinutos(escolhido);
  const referencia = paraMinutos(agora);
  if (alvo === null || referencia === null) return false;

  const inicio = Math.floor(referencia / JANELA_MIN) * JANELA_MIN;
  const fim = inicio + JANELA_MIN;
  // A janela da meia-noite não dá a volta: 00:00 é sempre o começo do dia.
  return alvo >= inicio && alvo < fim;
}

const NOTIFICATIONS: Record<string, { title: string; body: string; url: string }> = {
  morning_checkin: {
    title: 'Bom dia, sacerdotisa ✦',
    body: 'Como você acorda hoje? Um pequeno gesto de cuidado já transforma o dia.',
    url: '/checkin',
  },
  hydration: {
    title: '💧 Hora da água',
    body: 'Seu corpo é sagrado. Que tal um copo de água agora?',
    url: '/templo',
  },
  lunch_tea: {
    title: '🍵 Chá digestivo',
    body: 'Erva-doce, chá verde ou gengibre após o almoço. Ayurveda para uma digestão leve.',
    url: '/templo',
  },
  evening_checkin: {
    title: 'Como foi seu dia, sacerdotisa? 🌙',
    body: 'Reserve um momento para honrar o que viveu hoje.',
    url: '/checkin',
  },
  night_tea: {
    title: '🌿 Chá noturno',
    body: 'Camomila, melissa ou maracujá. Ritualize o encerramento do dia.',
    url: '/templo',
  },
  weekly_tarot: {
    title: '🃏 Sua tiragem da semana está pronta',
    body: 'As cartas têm uma mensagem especial para você esta semana.',
    url: '/templo',
  },
  credits_renewed: {
    title: '✦ Seus créditos foram renovados',
    body: 'Por onde quer começar esta semana, sacerdotisa?',
    url: '/templo',
  },
  credits_unused: {
    title: 'Você ainda tem consultas disponíveis ✦',
    body: 'Seus créditos renovam amanhã. Que tal usar antes que a semana vire?',
    url: '/sacerdotisa',
  },
  lunar_phase: {
    title: '🌕 Nova fase lunar',
    body: 'A lua mudou de fase. Veja a orientação energética para este ciclo.',
    url: '/templo',
  },
  monthly_retro: {
    title: '✨ Sua jornada do mês está pronta',
    body: 'É hora de celebrar o caminho percorrido. Veja sua retrospectiva.',
    url: '/templo',
  },
  monthly_wheel: {
    title: '⭕ Atualize sua Roda da Vida',
    body: 'Novo mês, nova visão de si mesma. Quanto você cresceu?',
    url: '/templo',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const supabase = servico();

    // ── Quem pode disparar ───────────────────────────────────────
    // Antes: qualquer um. O cron do Postgres se identifica pelo
    // segredo interno; disparo manual exige admin.
    const viaCron = segredoInternoValido(req);
    if (!viaCron) {
      const auth = await exigirAdmin(req, supabase);
      if ('resposta' in auth) return auth.resposta;
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidEmail = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@netzach.app';
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const body = await req.json() as { type: string; override_body?: string };
    const { type, override_body } = body;

    const template = NOTIFICATIONS[type];
    if (!template) {
      return erro(req, 400, `Tipo de notificação desconhecido: ${type}`);
    }

    const personalizavel = HORARIO_PROPRIO[type];
    const agora = horaLocalAgora();
    const hoje = dataLocalHoje();

    // ── Preferências de cada usuária ─────────────────────────────
    // A lógica anterior era invertida: buscava quem tinha a preferência
    // como `true` e, se a lista viesse vazia, mandava para todo mundo.
    // Quem desmarcava continuava recebendo enquanto poucas usuárias
    // tivessem linha na tabela.
    // Regra correta: sem linha salva vale o padrão; com a coluna em
    // `false`, não recebe.
    const colunas = ['user_id', type, personalizavel].filter(Boolean).join(', ');
    const { data: prefsRows, error: prefsError } = await supabase
      .from('notification_preferences')
      .select(colunas);

    if (prefsError) throw prefsError;

    type Pref = Record<string, unknown>;
    const prefs = new Map<string, Pref>();
    for (const linha of (prefsRows ?? []) as Pref[]) {
      prefs.set(String(linha.user_id), linha);
    }

    // ── Quem já recebeu este tipo hoje ───────────────────────────
    // As janelas se sobrepõem quando o cron atrasa ou é reexecutado.
    const jaRecebeu = new Set<string>();
    if (personalizavel) {
      const { data: enviados } = await supabase
        .from('notification_sends')
        .select('user_id')
        .eq('type', type)
        .eq('sent_on', hoje);
      for (const e of enviados ?? []) jaRecebeu.add(String((e as { user_id: string }).user_id));
    }

    const querReceber = (userId: string): boolean => {
      const pref = prefs.get(userId);

      // Coluna do tipo: ausente = padrão do banco (recebe).
      if (pref && pref[type] === false) return false;

      if (!personalizavel) return true;
      if (jaRecebeu.has(userId)) return false;

      const escolhido = (pref?.[personalizavel] as string | null | undefined)
        ?? PADRAO_HORARIO[personalizavel];
      return dentroDaJanela(escolhido, agora);
    };

    // ── Assinaturas, paginadas ───────────────────────────────────
    const PAGINA = 1000;
    type Assinatura = { user_id: string; endpoint: string; p256dh: string; auth: string };
    const subscriptions: Assinatura[] = [];

    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('user_id, endpoint, p256dh, auth')
        .range(inicio, inicio + PAGINA - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      subscriptions.push(...(data as Assinatura[]).filter(s => querReceber(s.user_id)));
      if (data.length < PAGINA) break;
    }

    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, type }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const notifBody = override_body || template.body;
    const payload = JSON.stringify({ title: template.title, body: notifBody, url: template.url });

    // Em lotes, para não estourar o tempo de execução da função.
    const LOTE = 100;
    const expirados: string[] = [];
    let sent = 0;

    for (let i = 0; i < subscriptions.length; i += LOTE) {
      const lote = subscriptions.slice(i, i + LOTE);
      const results = await Promise.allSettled(
        lote.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        )
      );

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') sent++;
        else if ([410, 404].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)) {
          expirados.push(lote[idx].endpoint);
        }
      });
    }

    for (let i = 0; i < expirados.length; i += LOTE) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expirados.slice(i, i + LOTE));
    }

    // Marca quem recebeu, para a próxima janela não repetir.
    if (personalizavel && sent > 0) {
      const registros = [...new Set(subscriptions.map(s => s.user_id))]
        .map(user_id => ({ user_id, type, sent_on: hoje }));
      for (let i = 0; i < registros.length; i += LOTE) {
        await supabase
          .from('notification_sends')
          .upsert(registros.slice(i, i + LOTE), { onConflict: 'user_id,type,sent_on' });
      }
    }

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, removidas: expirados.length, type, janela: personalizavel ? agora : null }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    console.error('scheduled-notifications error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Falha ao enviar as notificações agendadas');
  }
});

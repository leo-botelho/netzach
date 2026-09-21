import { corsHeaders, servico, erro, exigirAdmin } from '../_shared/auth.ts';
import { enviarParaUsuarias } from '../_shared/push.ts';

/**
 * A Raquel responde uma dúvida de curso, e quem estava na conversa é
 * avisada.
 *
 * Fica no servidor, e não na tela, por causa do aviso: o send-push manda
 * para a base inteira quando não recebe destino. Montar o destino no
 * navegador deixaria um erro bobo a um passo de avisar todas as alunas.
 * Aqui os destinatários saem do banco, e lista vazia não envia nada.
 *
 * O aviso não leva o texto da dúvida nem da resposta: notificação
 * aparece na tela bloqueada, e a pergunta pode ser pessoal.
 */

const LIMITE = 2000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return erro(req, 405, 'Método não permitido');

  try {
    const supabase = servico();
    const auth = await exigirAdmin(req, supabase);
    if ('resposta' in auth) return auth.resposta;
    const raquel = auth.usuaria.id;

    const { comentario_id, texto } = await req.json() as { comentario_id?: string; texto?: string };
    const limpo = (texto ?? '').trim();
    if (!comentario_id || !/^[0-9a-f-]{36}$/i.test(comentario_id)) {
      return erro(req, 400, 'comentario_id inválido');
    }
    if (!limpo || limpo.length > LIMITE) return erro(req, 400, `A resposta precisa ter entre 1 e ${LIMITE} caracteres`);

    // Responder a uma resposta vira resposta ao comentário de origem:
    // a conversa tem um nível só.
    const { data: alvo, error: errAlvo } = await supabase
      .from('curso_comentarios')
      .select('id, aula_id, resposta_a')
      .eq('id', comentario_id)
      .maybeSingle();
    if (errAlvo) throw errAlvo;
    if (!alvo) return erro(req, 404, 'Comentário não encontrado');
    const raiz = alvo.resposta_a ?? alvo.id;

    const { error: errInsert } = await supabase.from('curso_comentarios').insert({
      aula_id: alvo.aula_id,
      user_id: raquel,
      resposta_a: raiz,
      texto: limpo,
    });
    if (errInsert) throw errInsert;

    // ── Aviso ────────────────────────────────────────────────────
    // A resposta já está gravada. Daqui para baixo, falhar em avisar não
    // desfaz nada nem vira erro para a Raquel: ela respondeu, e a aluna
    // vê quando abrir a aula.
    let avisadas = 0;
    try {
      const { data: participantes } = await supabase
        .from('curso_comentarios')
        .select('user_id')
        .or(`id.eq.${raiz},resposta_a.eq.${raiz}`)
        .eq('status', 'publicado');

      const ids = [...new Set((participantes ?? []).map(p => p.user_id as string))]
        .filter(id => id && id !== raquel);

      // Quem desligou "respostas às suas dúvidas" não recebe.
      let destino = ids;
      if (ids.length) {
        const { data: desligadas } = await supabase
          .from('notification_preferences')
          .select('user_id')
          .in('user_id', ids)
          .eq('course_replies', false);
        const fora = new Set((desligadas ?? []).map(d => d.user_id as string));
        destino = ids.filter(id => !fora.has(id));
      }

      if (destino.length) {
        const { data: aula } = await supabase
          .from('curso_aulas')
          .select('titulo, curso_modulos(cursos(slug))')
          .eq('id', alvo.aula_id)
          .maybeSingle();

        const modulo = aula?.curso_modulos as unknown as { cursos: { slug: string } | null } | null;
        const slug = modulo?.cursos?.slug;
        const url = slug ? `/cursos/${slug}/aula/${alvo.aula_id}#comentario-${raiz}` : '/cursos';

        const r = await enviarParaUsuarias(supabase, destino, {
          title: 'A Raquel respondeu ✦',
          body: aula?.titulo ? `Na conversa da aula "${aula.titulo}"` : 'Na conversa de uma aula do seu curso',
          url,
        });
        avisadas = r.sent;
      }
    } catch (e) {
      console.error('responder-duvida: resposta gravada, aviso falhou:', e instanceof Error ? e.message : String(e));
    }

    return new Response(JSON.stringify({ ok: true, avisadas }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('responder-duvida:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Não consegui gravar a resposta');
  }
});

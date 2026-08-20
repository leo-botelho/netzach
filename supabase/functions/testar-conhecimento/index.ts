import { corsHeaders, servico, erro, exigirAdmin } from '../_shared/auth.ts';

/**
 * Mostra o que a sacerdotisa recebe para uma pergunta.
 *
 * Quando ela responde algo errado, há duas causas possíveis: o material
 * que chegou até ela estava errado, ou ela usou mal um material certo.
 * Sem ver o que chegou, não dá para saber qual das duas.
 *
 * Esta função faz a mesma busca que a `sacerdotisa` faria e devolve os
 * trechos encontrados com a nota de proximidade. Não chama o modelo:
 * é instantâneo e não custa nada.
 */

/** O mesmo corte usado na sacerdotisa: abaixo disso, o trecho é descartado. */
const CORTE = 0.5;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });

  try {
    const supabase = servico();

    const auth = await exigirAdmin(req, supabase);
    if ('resposta' in auth) return auth.resposta;

    const { pergunta, categoria } = await req.json();
    if (!pergunta?.trim()) return erro(req, 400, 'Escreva uma pergunta para testar');

    // Mesmo modelo de embedding da sacerdotisa.
    const modelo = new (Supabase as any).ai.Session('gte-small');
    const vetor = await modelo.run(pergunta, { mean_pool: true, normalize: true });

    const { data: trechos, error } = await supabase.rpc('match_knowledge', {
      query_embedding: vetor,
      // Traz mais do que a sacerdotisa usa, para mostrar também o que
      // ficou de fora por pouco.
      match_count: 12,
      filter_category: categoria || null,
    });

    if (error) throw error;

    const lista = (trechos ?? []) as Array<{
      title: string; content: string; category: string; similarity: number;
    }>;

    return new Response(JSON.stringify({
      pergunta,
      corte: CORTE,
      // O que a sacerdotisa realmente veria
      usados: lista.filter(t => t.similarity > CORTE).slice(0, 5).map(t => ({
        titulo: t.title,
        categoria: t.category,
        proximidade: Number(t.similarity.toFixed(3)),
        trecho: t.content.slice(0, 400),
      })),
      // O que existe na base mas não chegaria até ela
      descartados: lista
        .filter(t => t.similarity <= CORTE)
        .slice(0, 5)
        .map(t => ({
          titulo: t.title,
          categoria: t.category,
          proximidade: Number(t.similarity.toFixed(3)),
        })),
    }), { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    console.error('testar-conhecimento error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Não foi possível consultar a base agora');
  }
});

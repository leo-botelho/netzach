import { corsHeaders, servico, erro, exigirAdmin } from '../_shared/auth.ts';

// Teto de tamanho: o conteúdo entra no system prompt da sacerdotisa,
// e um texto gigante ali é custo por consulta, para sempre.
const MAX_CONTEUDO = 20_000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const supabase = servico();

    // ── Só admin ─────────────────────────────────────────────────
    // Esta função não tinha autenticação nenhuma, e o que ela grava é
    // injetado literalmente no system prompt: qualquer pessoa podia
    // reescrever o comportamento da sacerdotisa para toda a base.
    const auth = await exigirAdmin(req, supabase);
    if ('resposta' in auth) return auth.resposta;

    const { title, content, category, metadata } = await req.json();

    if (!title || !content || !category) {
      return erro(req, 400, 'title, content e category são obrigatórios');
    }
    if (typeof content !== 'string' || content.length > MAX_CONTEUDO) {
      return erro(req, 400, `content deve ser texto de até ${MAX_CONTEUDO} caracteres`);
    }

    const validCategories = [
      'banho', 'oleo', 'floral', 'cristal', 'ritual',
      'numerologia', 'astrologia', 'ciclo_feminino', 'chakra', 'tarot',
      'ervas', 'hooponopono', 'relacionamento', 'lei_atracao', 'crianca_interior', 'geral',
    ];
    if (!validCategories.includes(category)) {
      return erro(req, 400, `category deve ser um de: ${validCategories.join(', ')}`);
    }

    // Gerar embedding com Supabase AI (gte-small, 384 dims)
    const model = new Supabase.ai.Session('gte-small');
    const embedding = await model.run(content, { mean_pool: true, normalize: true });

    // Inserir no banco
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        title,
        content,
        category,
        embedding,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('Ingest error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Erro ao ingerir conhecimento');
  }
});

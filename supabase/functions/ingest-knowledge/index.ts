import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, category, metadata } = await req.json();

    if (!title || !content || !category) {
      return new Response(
        JSON.stringify({ error: 'title, content e category são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validCategories = [
      'banho', 'oleo', 'floral', 'cristal', 'ritual',
      'numerologia', 'astrologia', 'ciclo_feminino', 'chakra', 'tarot',
      'ervas', 'hooponopono', 'relacionamento', 'lei_atracao', 'crianca_interior', 'geral',
    ];
    if (!validCategories.includes(category)) {
      return new Response(
        JSON.stringify({ error: `category deve ser um de: ${validCategories.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Ingest error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao ingerir conhecimento', detail: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

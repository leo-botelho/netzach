import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_CATEGORIES = [
  'banho', 'oleo', 'floral', 'cristal', 'ritual',
  'numerologia', 'astrologia', 'ciclo_feminino', 'chakra', 'tarot',
  'ervas', 'hooponopono', 'relacionamento', 'lei_atracao', 'crianca_interior', 'geral',
];

/**
 * Divide o texto em chunks com overlap.
 * Estratégia: respeita quebras de parágrafo, limite de palavras por chunk.
 */
function chunkText(text: string, maxWords = 300, overlapWords = 40): string[] {
  // Normaliza quebras de linha
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 20); // ignora linhas muito curtas (títulos, separadores)

  const chunks: string[] = [];
  let current: string[] = [];
  let wordCount = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/);

    // Se o parágrafo sozinho já é maior que maxWords, divide por frases
    if (words.length > maxWords) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
      for (const sentence of sentences) {
        const sw = sentence.split(/\s+/);
        if (wordCount + sw.length > maxWords && current.length > 0) {
          chunks.push(current.join('\n\n'));
          // overlap: mantém as últimas `overlapWords` palavras
          const flat = current.join(' ').split(/\s+/);
          const overlapText = flat.slice(-overlapWords).join(' ');
          current = [overlapText];
          wordCount = overlapWords;
        }
        current.push(sentence.trim());
        wordCount += sw.length;
      }
    } else {
      if (wordCount + words.length > maxWords && current.length > 0) {
        chunks.push(current.join('\n\n'));
        const flat = current.join(' ').split(/\s+/);
        const overlapText = flat.slice(-overlapWords).join(' ');
        current = [overlapText];
        wordCount = overlapWords;
      }
      current.push(para);
      wordCount += words.length;
    }
  }

  if (current.length > 0 && current.join(' ').split(/\s+/).length > 10) {
    chunks.push(current.join('\n\n'));
  }

  return chunks;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      source_title,   // ex: "A Chave da Teosofia"
      text,           // texto completo do livro/capítulo
      category,       // categoria única para todos os chunks
      chunk_size,     // palavras por chunk (padrão: 300)
      overlap_size,   // palavras de overlap (padrão: 40)
    } = await req.json();

    if (!source_title || !text || !category) {
      return new Response(
        JSON.stringify({ error: 'source_title, text e category são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({ error: `category deve ser: ${VALID_CATEGORIES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const chunks = chunkText(text, chunk_size ?? 300, overlap_size ?? 40);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum chunk gerado — texto muito curto ou vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const model = new (Supabase as any).ai.Session('gte-small');

    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await model.run(chunk, { mean_pool: true, normalize: true });

        const { error } = await supabase.from('knowledge_base').insert({
          title: `${source_title} — parte ${i + 1}/${chunks.length}`,
          content: chunk,
          category,
          embedding,
          metadata: { source: source_title, chunk_index: i, total_chunks: chunks.length },
        });

        if (error) errors.push(`chunk ${i + 1}: ${error.message}`);
        else inserted++;
      } catch (e: unknown) {
        errors.push(`chunk ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total_chunks: chunks.length,
        inserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('ingest-bulk error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { corsHeaders, servico, erro, exigirAdmin } from '../_shared/auth.ts';

// Teto de entrada: sem limite, um texto grande gerava centenas de
// embeddings numa única invocação e estourava o tempo da função.
const MAX_TEXTO = 400_000;
const MAX_CHUNKS = 400;

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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });

  try {
    const supabase = servico();

    // ── Só admin ─────────────────────────────────────────────────
    // Mesmo risco do ingest-knowledge: o que entra aqui vai para o
    // system prompt da sacerdotisa.
    const auth = await exigirAdmin(req, supabase);
    if ('resposta' in auth) return auth.resposta;

    const {
      source_title,   // ex: "A Chave da Teosofia"
      text,           // texto completo do livro/capítulo
      category,       // categoria única para todos os chunks
      chunk_size,     // palavras por chunk (padrão: 300)
      overlap_size,   // palavras de overlap (padrão: 40)
    } = await req.json();

    if (!source_title || !text || !category) {
      return erro(req, 400, 'source_title, text e category são obrigatórios');
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return erro(req, 400, `category deve ser: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (typeof text !== 'string' || text.length > MAX_TEXTO) {
      return erro(req, 400, `text deve ser texto de até ${MAX_TEXTO} caracteres. Divida em partes menores.`);
    }

    const chunks = chunkText(text, chunk_size ?? 300, overlap_size ?? 40);

    if (chunks.length === 0) {
      return erro(req, 400, 'Nenhum chunk gerado — texto muito curto ou vazio');
    }

    if (chunks.length > MAX_CHUNKS) {
      return erro(req, 400,
        `Este texto geraria ${chunks.length} trechos, acima do limite de ${MAX_CHUNKS} por envio. Divida em partes menores.`);
    }

    const model = new (Supabase as any).ai.Session('gte-small');

    let inserted = 0;
    const errors: string[] = [];

    // Embedding continua sendo um por trecho (o modelo é local), mas a
    // gravação vai em lote: antes era um INSERT por trecho.
    const LOTE = 50;
    let pendentes: Record<string, unknown>[] = [];

    const gravar = async () => {
      if (pendentes.length === 0) return;
      const { error } = await supabase.from('knowledge_base').insert(pendentes);
      if (error) errors.push(`lote de ${pendentes.length} trechos: ${error.message}`);
      else inserted += pendentes.length;
      pendentes = [];
    };

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await model.run(chunk, { mean_pool: true, normalize: true });
        pendentes.push({
          title: `${source_title} — parte ${i + 1}/${chunks.length}`,
          content: chunk,
          category,
          embedding,
          metadata: { source: source_title, chunk_index: i, total_chunks: chunks.length },
        });
        if (pendentes.length >= LOTE) await gravar();
      } catch (e: unknown) {
        errors.push(`chunk ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    await gravar();

    return new Response(
      JSON.stringify({
        ok: true,
        total_chunks: chunks.length,
        inserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    console.error('ingest-bulk error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Falha ao ingerir o material');
  }
});

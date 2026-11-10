import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { decifrar, segredoDeCifraValido } from './cifra.ts';
import { ehProvedor, modeloValido, type Alvo, type Provedor } from './llm.ts';

/**
 * Qual modelo a Sacerdotisa usa, e com qual chave.
 *
 * A configuração vem do painel (tabelas ia_config e ia_chaves). Quando ela
 * não existe ou não pode ser lida, vale o padrão de antes: Claude Haiku
 * com a chave dos segredos da função. A Sacerdotisa não pode ficar sem
 * resposta por causa de configuração: uma migration que ainda não rodou,
 * uma chave que não decifra, um segredo que faltou.
 */

export interface Escolha {
  provedor: Provedor;
  modelo: string;
}

export interface ConfigIA {
  primario: Escolha;
  reserva: Escolha | null;
  reservaLigada: boolean;
  atualizadoEm?: string;
}

export const ESCOLHA_PADRAO: Escolha = { provedor: 'anthropic', modelo: 'claude-haiku-4-5-20251001' };

export const CONFIG_PADRAO: ConfigIA = { primario: ESCOLHA_PADRAO, reserva: null, reservaLigada: false };

/** O segredo que cifra as chaves, ou null se não estiver definido (ou for curto). */
export function segredoDeCifra(): string | null {
  const s = Deno.env.get('IA_ENCRYPTION_KEY');
  return segredoDeCifraValido(s) ? s : null;
}

/**
 * O erro do banco chega como objeto simples ({ code, message }), não como
 * `Error`, e `String()` dele dá "[object Object]": o log não dizia nada.
 */
function descrever(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export async function lerConfig(supabase: SupabaseClient): Promise<{ config: ConfigIA; configurada: boolean }> {
  try {
    const { data, error } = await supabase.from('ia_config').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) return { config: CONFIG_PADRAO, configurada: false };

    if (!ehProvedor(data.primario_provedor) || !modeloValido(data.primario_modelo)) {
      throw new Error('configuração do modelo principal inválida');
    }
    const temReserva = ehProvedor(data.reserva_provedor) && modeloValido(data.reserva_modelo);

    return {
      configurada: true,
      config: {
        primario: { provedor: data.primario_provedor, modelo: data.primario_modelo },
        reserva: temReserva ? { provedor: data.reserva_provedor, modelo: data.reserva_modelo } : null,
        reservaLigada: Boolean(data.reserva_ligada) && temReserva,
        atualizadoEm: data.atualizado_em,
      },
    };
  } catch (e) {
    // Sem isto, uma migration atrasada derrubaria a Sacerdotisa inteira.
    console.warn('ia: configuração não pôde ser lida, usando o padrão:', descrever(e));
    return { config: CONFIG_PADRAO, configurada: false };
  }
}

/** A chave de uma plataforma: a cadastrada no painel, ou (só Claude) a dos segredos da função. */
export async function chaveDe(supabase: SupabaseClient, provedor: Provedor): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ia_chaves').select('chave_cifrada').eq('provedor', provedor).maybeSingle();
    if (error) throw error;

    if (data?.chave_cifrada) {
      const segredo = segredoDeCifra();
      if (!segredo) {
        console.warn(`ia: há uma chave de ${provedor} no banco, mas IA_ENCRYPTION_KEY não está definido`);
      } else {
        try {
          return await decifrar(data.chave_cifrada, segredo, provedor);
        } catch {
          // Segredo trocado, valor adulterado ou formato antigo.
          console.error(`ia: a chave de ${provedor} no banco não pôde ser decifrada`);
        }
      }
    }
  } catch (e) {
    console.warn(`ia: não consegui ler a chave de ${provedor}:`, descrever(e));
  }

  return provedor === 'anthropic' ? (Deno.env.get('ANTHROPIC_API_KEY') ?? null) : null;
}

/**
 * Os modelos a tentar, em ordem: o principal e, se ligada, a reserva. Um
 * que não tem chave utilizável é pulado (com aviso no log). Se nada
 * sobrar, volta ao padrão, para a Sacerdotisa continuar respondendo.
 */
export async function resolverAlvos(supabase: SupabaseClient): Promise<Alvo[]> {
  const { config } = await lerConfig(supabase);

  const escolhas: Escolha[] = [config.primario];
  if (config.reservaLigada && config.reserva) escolhas.push(config.reserva);

  const alvos: Alvo[] = [];
  for (const e of escolhas) {
    const chave = await chaveDe(supabase, e.provedor);
    if (chave) alvos.push({ provedor: e.provedor, modelo: e.modelo, chave });
    else console.warn(`ia: ${e.provedor}/${e.modelo} ignorado, sem chave utilizável`);
  }

  if (alvos.length === 0) {
    const chave = await chaveDe(supabase, ESCOLHA_PADRAO.provedor);
    if (chave) {
      console.warn('ia: nenhum modelo configurado utilizável, usando o padrão');
      alvos.push({ ...ESCOLHA_PADRAO, chave });
    }
  }
  return alvos;
}

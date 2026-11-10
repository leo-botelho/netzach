import { corsHeaders, servico, exigirAdmin } from '../_shared/auth.ts';
import { cifrar } from '../_shared/cifra.ts';
import {
  abrir, ehProvedor, modeloValido, redigir, NOMES_DOS_PROVEDORES, PROVEDORES,
  type Provedor,
} from '../_shared/llm.ts';
import { chaveDe, lerConfig, segredoDeCifra, ESCOLHA_PADRAO, type Escolha } from '../_shared/ia.ts';

/**
 * Configuração dos modelos de IA, pelo painel da administradora.
 *
 * É a ÚNICA porta de entrada para as chaves de API. As tabelas ficam
 * trancadas para o navegador e aqui:
 *   - só a administradora chama (conferido no servidor, não na tela);
 *   - a chave é cifrada antes de ir para o banco;
 *   - nada devolve uma chave, só os 4 últimos caracteres;
 *   - nada registra uma chave: todo erro passa por `redigir`.
 *
 * Ações (campo `acao` do corpo): ler, salvar_chave, remover_chave,
 * salvar_config, trocar, testar.
 */

type SupabaseServico = ReturnType<typeof servico>;

const resposta = (req: Request, dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });

const problema = (req: Request, status: number, codigo: string, mensagem: string, extra: Record<string, unknown> = {}) =>
  resposta(req, { error: codigo, mensagem, ...extra }, status);

/** A migration ainda não rodou: a tabela não existe. */
function faltaMigration(erro: { message?: string; code?: string } | null): boolean {
  return Boolean(erro && (erro.code === '42P01' || erro.code === 'PGRST205' || /ia_chaves|ia_config|schema cache/i.test(erro.message ?? '')));
}

async function temChave(supabase: SupabaseServico, provedor: Provedor): Promise<boolean> {
  const { data } = await supabase.from('ia_chaves').select('provedor').eq('provedor', provedor).maybeSingle();
  if (data) return true;
  return provedor === 'anthropic' && Boolean(Deno.env.get('ANTHROPIC_API_KEY'));
}

function lerEscolha(valor: unknown): Escolha | null {
  if (!valor || typeof valor !== 'object') return null;
  const { provedor, modelo } = valor as Record<string, unknown>;
  if (!ehProvedor(provedor) || typeof modelo !== 'string') return null;
  const limpo = modelo.trim();
  return modeloValido(limpo) ? { provedor, modelo: limpo } : null;
}

async function estadoDoPainel(supabase: SupabaseServico) {
  const { config, configurada } = await lerConfig(supabase);

  const { data: linhas, error } = await supabase.from('ia_chaves').select('provedor, ultimos4, atualizado_em');
  if (error) throw error;

  const chaves: Record<string, { ultimos4: string; atualizado_em: string } | null> = {};
  for (const p of PROVEDORES) chaves[p] = null;
  for (const l of linhas ?? []) chaves[l.provedor] = { ultimos4: l.ultimos4, atualizado_em: l.atualizado_em };

  return {
    configurada,
    padrao: ESCOLHA_PADRAO,
    segredo_de_cifra: segredoDeCifra() !== null,
    // A chave dos segredos da função continua valendo para o Claude.
    chave_no_ambiente: { anthropic: Boolean(Deno.env.get('ANTHROPIC_API_KEY')) },
    chaves,
    primario: config.primario,
    reserva: config.reserva,
    reserva_ligada: config.reservaLigada,
    atualizado_em: config.atualizadoEm ?? null,
  };
}

async function gravarConfig(
  supabase: SupabaseServico,
  adminId: string,
  primario: Escolha,
  reserva: Escolha | null,
  reservaLigada: boolean,
) {
  return supabase.from('ia_config').upsert({
    id: 1,
    primario_provedor: primario.provedor,
    primario_modelo: primario.modelo,
    reserva_provedor: reserva?.provedor ?? null,
    reserva_modelo: reserva?.modelo ?? null,
    reserva_ligada: Boolean(reserva) && reservaLigada,
    atualizado_em: new Date().toISOString(),
    atualizado_por: adminId,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return problema(req, 405, 'metodo', 'Método não permitido');

  try {
    const supabase = servico();
    const auth = await exigirAdmin(req, supabase);
    if ('resposta' in auth) return auth.resposta;
    const adminId = auth.usuaria.id;

    const corpo = await req.json().catch(() => ({})) as Record<string, unknown>;
    const acao = corpo.acao;

    // ── ler ──────────────────────────────────────────────────
    if (acao === 'ler') {
      try {
        return resposta(req, await estadoDoPainel(supabase));
      } catch (e) {
        if (faltaMigration(e as { message?: string; code?: string })) {
          return problema(req, 409, 'migration_pendente', 'Rode a migration 20261110_ia_modelos.sql no banco.');
        }
        throw e;
      }
    }

    // ── salvar_chave ─────────────────────────────────────────
    if (acao === 'salvar_chave') {
      const provedor = corpo.provedor;
      const chave = typeof corpo.chave === 'string' ? corpo.chave.trim() : '';
      if (!ehProvedor(provedor)) return problema(req, 400, 'provedor', 'Plataforma desconhecida.');
      // Sem espaços ou quebras de linha: um erro de colagem comum, que faria a chave falhar sem explicação.
      if (chave.length < 20 || chave.length > 400 || /\s/.test(chave)) {
        return problema(req, 400, 'chave_invalida', 'A chave parece incompleta ou tem espaços. Copie de novo, inteira.');
      }

      const segredo = segredoDeCifra();
      if (!segredo) {
        return problema(req, 409, 'sem_segredo_de_cifra', 'Falta definir o segredo que cifra as chaves (IA_ENCRYPTION_KEY).');
      }

      const { error } = await supabase.from('ia_chaves').upsert({
        provedor,
        chave_cifrada: await cifrar(chave, segredo, provedor),
        ultimos4: chave.slice(-4),
        atualizado_em: new Date().toISOString(),
        atualizado_por: adminId,
      });
      if (error) {
        if (faltaMigration(error)) return problema(req, 409, 'migration_pendente', 'Rode a migration 20261110_ia_modelos.sql no banco.');
        throw error;
      }
      console.log(`ia-config: chave de ${provedor} salva`);
      return resposta(req, { ok: true, ultimos4: chave.slice(-4) });
    }

    // ── remover_chave ────────────────────────────────────────
    if (acao === 'remover_chave') {
      const provedor = corpo.provedor;
      if (!ehProvedor(provedor)) return problema(req, 400, 'provedor', 'Plataforma desconhecida.');

      const { config } = await lerConfig(supabase);
      const emUso = config.primario.provedor === provedor || (config.reservaLigada && config.reserva?.provedor === provedor);
      const cobertaPeloAmbiente = provedor === 'anthropic' && Boolean(Deno.env.get('ANTHROPIC_API_KEY'));
      if (emUso && !cobertaPeloAmbiente) {
        return problema(req, 409, 'chave_em_uso', `${NOMES_DOS_PROVEDORES[provedor]} está em uso como principal ou reserva. Troque o modelo antes de remover a chave.`);
      }

      const { error } = await supabase.from('ia_chaves').delete().eq('provedor', provedor);
      if (error) throw error;
      console.log(`ia-config: chave de ${provedor} removida`);
      return resposta(req, { ok: true });
    }

    // ── salvar_config ────────────────────────────────────────
    if (acao === 'salvar_config') {
      const primario = lerEscolha(corpo.primario);
      if (!primario) return problema(req, 400, 'primario', 'Escolha a plataforma e escreva o nome do modelo principal.');

      const reserva = corpo.reserva ? lerEscolha(corpo.reserva) : null;
      if (corpo.reserva && !reserva) return problema(req, 400, 'reserva', 'O modelo de reserva está incompleto.');
      const ligada = Boolean(corpo.reserva_ligada) && Boolean(reserva);

      // Cada plataforma escolhida precisa ter chave, senão o modelo falharia na primeira consulta.
      const usadas = [...new Set([primario.provedor, ...(ligada && reserva ? [reserva.provedor] : [])])];
      for (const p of usadas) {
        if (!(await temChave(supabase, p))) {
          return problema(req, 422, 'sem_chave', `Cadastre a chave da ${NOMES_DOS_PROVEDORES[p]} antes de usá-la.`, { provedor: p });
        }
      }

      const { error } = await gravarConfig(supabase, adminId, primario, reserva, ligada);
      if (error) {
        if (faltaMigration(error)) return problema(req, 409, 'migration_pendente', 'Rode a migration 20261110_ia_modelos.sql no banco.');
        throw error;
      }
      console.log(`ia-config: principal ${primario.provedor}/${primario.modelo}, reserva ${reserva ? `${reserva.provedor}/${reserva.modelo}` : 'nenhuma'}, ligada=${ligada}`);
      return resposta(req, await estadoDoPainel(supabase));
    }

    // ── trocar ───────────────────────────────────────────────
    if (acao === 'trocar') {
      const { config } = await lerConfig(supabase);
      if (!config.reserva) return problema(req, 409, 'sem_reserva', 'Não há modelo de reserva para trocar.');

      const { error } = await gravarConfig(supabase, adminId, config.reserva, config.primario, config.reservaLigada);
      if (error) throw error;
      console.log('ia-config: principal e reserva trocados');
      return resposta(req, await estadoDoPainel(supabase));
    }

    // ── testar ───────────────────────────────────────────────
    // Chama o modelo de verdade, com um pedido minúsculo, para a
    // administradora saber na hora se a chave e o nome do modelo estão certos.
    if (acao === 'testar') {
      const escolha = lerEscolha({ provedor: corpo.provedor, modelo: corpo.modelo });
      if (!escolha) return problema(req, 400, 'modelo', 'Escolha a plataforma e escreva o nome do modelo.');

      const chave = await chaveDe(supabase, escolha.provedor);
      if (!chave) {
        return resposta(req, { ok: false, ms: 0, erro: `Nenhuma chave cadastrada para ${NOMES_DOS_PROVEDORES[escolha.provedor]}.` });
      }

      const inicio = Date.now();
      try {
        const aberta = await abrir(
          { ...escolha, chave },
          {
            sistema: [{ texto: 'Você responde de forma curtíssima.' }],
            mensagens: [{ role: 'user', content: 'Responda apenas com a palavra: ok' }],
            maxTokens: 20,
          },
          { limiteMs: 20_000 },
        );
        let texto = '';
        for await (const parte of aberta.deltas) {
          texto += parte;
          if (texto.length > 120) break;
        }
        return resposta(req, { ok: true, ms: Date.now() - inicio, resposta: texto.trim().slice(0, 120) });
      } catch (e) {
        return resposta(req, { ok: false, ms: Date.now() - inicio, erro: redigir(e instanceof Error ? e.message : String(e), chave) });
      }
    }

    return problema(req, 400, 'acao', 'Ação desconhecida.');
  } catch (err: unknown) {
    console.error('ia-config:', redigir(err instanceof Error ? err.message : String(err)));
    return problema(req, 500, 'interno', 'Não consegui concluir. Tente de novo.');
  }
});

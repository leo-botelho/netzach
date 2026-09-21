/**
 * Regras da área de cursos que não dependem de tela nem de banco.
 *
 * Ficam aqui para serem testadas sozinhas: é onde mora o que pode dar
 * errado sem ninguém perceber (um link do YouTube colado num formato
 * diferente, a aula de onde a aluna deveria continuar).
 */

export type Provedor = 'youtube' | 'cloudflare';

export interface Curso {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  capa_url: string | null;
  publicado: boolean;
  ordem: number;
}

export interface Modulo {
  id: string;
  curso_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
}

export interface Aula {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string | null;
  duracao_seg: number | null;
  gratuita: boolean;
  ordem: number;
}

export interface Progresso {
  aula_id: string;
  posicao_seg: number;
  concluida_em: string | null;
}

export interface ModuloComAulas extends Modulo {
  aulas: Aula[];
}

/**
 * Tira o código do vídeo de qualquer forma de link do YouTube que a
 * Raquel possa colar: o endereço da barra do navegador, o link curto do
 * botão "compartilhar", o de incorporar, o de Shorts, ou o código puro.
 * Devolve null se não reconhecer: melhor recusar do que gravar lixo.
 */
export function extrairIdYoutube(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;

  // O código sozinho tem 11 caracteres deste alfabeto.
  if (/^[A-Za-z0-9_-]{11}$/.test(texto)) return texto;

  let url: URL;
  try {
    url = new URL(texto.startsWith('http') ? texto : `https://${texto}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let candidato: string | null = null;

  if (host === 'youtu.be') {
    candidato = url.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      candidato = url.searchParams.get('v');
    } else {
      const [, tipo, id] = url.pathname.split('/');
      if (tipo === 'embed' || tipo === 'shorts' || tipo === 'live' || tipo === 'v') {
        candidato = id ?? null;
      }
    }
  }

  return candidato && /^[A-Za-z0-9_-]{11}$/.test(candidato) ? candidato : null;
}

/** "1h 05min", "12min", "45s" — para a lista de aulas. */
export function formatarDuracao(segundos: number | null | undefined): string {
  if (!segundos || segundos <= 0) return '';
  const h = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  if (h > 0) return `${h}h ${String(min).padStart(2, '0')}min`;
  if (min > 0) return `${min}min`;
  return `${segundos}s`;
}

/** Aulas do curso na ordem em que devem ser assistidas. */
export function aulasEmOrdem(modulos: ModuloComAulas[]): Aula[] {
  return [...modulos]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap(m => [...m.aulas].sort((a, b) => a.ordem - b.ordem));
}

export function percentualConcluido(aulas: Aula[], progresso: Progresso[]): number {
  if (aulas.length === 0) return 0;
  const concluidas = new Set(progresso.filter(p => p.concluida_em).map(p => p.aula_id));
  const feitas = aulas.filter(a => concluidas.has(a.id)).length;
  return Math.round((feitas / aulas.length) * 100);
}

/**
 * Onde a aluna continua: a aula que ela começou e não terminou mais
 * recente na ordem do curso; se não houver, a primeira que ainda não
 * concluiu. Curso todo concluído volta para a primeira aula.
 */
export function aulaParaContinuar(aulas: Aula[], progresso: Progresso[]): Aula | null {
  if (aulas.length === 0) return null;
  const porAula = new Map(progresso.map(p => [p.aula_id, p]));

  const emAndamento = aulas.filter(a => {
    const p = porAula.get(a.id);
    return p && !p.concluida_em && p.posicao_seg > 0;
  });
  if (emAndamento.length > 0) return emAndamento[emAndamento.length - 1];

  return aulas.find(a => !porAula.get(a.id)?.concluida_em) ?? aulas[0];
}

export function vizinhas(aulas: Aula[], aulaId: string): { anterior: Aula | null; proxima: Aula | null } {
  const i = aulas.findIndex(a => a.id === aulaId);
  if (i === -1) return { anterior: null, proxima: null };
  return { anterior: aulas[i - 1] ?? null, proxima: aulas[i + 1] ?? null };
}

/**
 * Uma aula conta como assistida a partir de 90% do vídeo: ninguém
 * espera os créditos finais, e exigir 100% deixaria aulas inteiras
 * vistas marcadas como pendentes.
 */
export const LIMIAR_CONCLUSAO = 0.9;

export function deveConcluir(posicao: number, duracao: number): boolean {
  return duracao > 0 && posicao / duracao >= LIMIAR_CONCLUSAO;
}

/** slug a partir do título: "Flor da Vida — Módulo 1" → "flor-da-vida-modulo-1". */
export function gerarSlug(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

export interface LinhaDeAula {
  titulo: string;
  videoId: string;
}

export interface LeituraDeAulas {
  aulas: LinhaDeAula[];
  /** Linhas que não deu para entender, com o número (a partir de 1). */
  problemas: { linha: number; texto: string; motivo: string }[];
}

/**
 * Lê o cadastro em lote: uma aula por linha, "título | link do YouTube".
 * Aceita também tabulação (colar de uma planilha) e ";" como separador.
 * Linha em branco é ignorada; linha que não dá para entender é
 * devolvida em `problemas`, sem derrubar as outras.
 */
export function lerLinhasDeAulas(texto: string): LeituraDeAulas {
  const aulas: LinhaDeAula[] = [];
  const problemas: LeituraDeAulas['problemas'] = [];

  texto.split(/\r?\n/).forEach((bruta, i) => {
    const linha = bruta.trim();
    if (!linha) return;

    const partes = linha.split(/\s*[|\t;]\s*/).filter(Boolean);
    if (partes.length < 2) {
      problemas.push({ linha: i + 1, texto: linha, motivo: 'Falta o título ou o link. Use: título | link' });
      return;
    }

    // O link é a última parte; o resto é título (que pode ter "|").
    const link = partes[partes.length - 1];
    const titulo = partes.slice(0, -1).join(' | ').trim();
    const videoId = extrairIdYoutube(link);

    if (!videoId) {
      problemas.push({ linha: i + 1, texto: linha, motivo: 'Não reconheci o link do YouTube' });
      return;
    }
    if (titulo.length > 160) {
      problemas.push({ linha: i + 1, texto: linha, motivo: 'Título passa de 160 caracteres' });
      return;
    }

    aulas.push({ titulo, videoId });
  });

  return { aulas, problemas };
}

/** "12", "12:30", "1:02:30" → segundos. Minutos quando é um número só. */
export function lerDuracao(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const partes = t.split(':');
  if (partes.length < 2 || partes.length > 3 || partes.some(p => !/^\d+$/.test(p))) return null;
  const n = partes.map(Number);
  if (n.slice(1).some(x => x > 59)) return null;
  return n.reduce((total, x) => total * 60 + x, 0);
}

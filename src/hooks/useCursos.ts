import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import {
  aulasEmOrdem, deveConcluir,
  type Aula, type Curso, type ModuloComAulas, type Progresso, type Provedor,
} from '../lib/cursos';

/**
 * Dados da área de cursos.
 *
 * O que a aluna pode ver é decidido pela RLS, não aqui: a estrutura do
 * curso (títulos, módulos, aulas) vem para toda aluna logada, e o código
 * do vídeo só vem para quem tem acesso. Estes hooks só juntam as peças.
 */

const CAMPOS_AULA = 'id, modulo_id, titulo, descricao, duracao_seg, gratuita, ordem';
const CAMPOS_CURSO = 'id, slug, titulo, subtitulo, descricao, capa_url, publicado, ordem';

type ModuloBruto = Omit<ModuloComAulas, 'aulas'> & { curso_aulas: Aula[] | null };

function montarModulos(brutos: ModuloBruto[] | null): ModuloComAulas[] {
  return (brutos ?? [])
    .map(({ curso_aulas, ...m }) => ({ ...m, aulas: curso_aulas ?? [] }))
    .sort((a, b) => a.ordem - b.ordem);
}

// ───────────────────────────────────────────────────────────────
// Lista de cursos
// ───────────────────────────────────────────────────────────────

export interface CursoNaLista extends Curso {
  totalAulas: number;
  concluidas: number;
  temAcesso: boolean;
}

export function useCursos() {
  const { userId } = useAuth();
  const [cursos, setCursos] = useState<CursoNaLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let ativo = true;

    (async () => {
      const [lista, acessos, progresso] = await Promise.all([
        supabase.from('cursos')
          .select(`${CAMPOS_CURSO}, curso_modulos(id, curso_aulas(id))`)
          .eq('publicado', true)
          .order('ordem'),
        supabase.from('curso_acessos').select('curso_id, expira_em').eq('user_id', userId),
        supabase.from('curso_progresso').select('aula_id').eq('user_id', userId).not('concluida_em', 'is', null),
      ]);
      if (!ativo) return;

      const falha = lista.error ?? acessos.error ?? progresso.error;
      if (falha) {
        console.error('Falha ao carregar os cursos:', falha.message);
        setErro('Não consegui abrir os cursos agora. Tente de novo em instantes.');
        setCarregando(false);
        return;
      }

      const agora = Date.now();
      const liberados = new Set(
        (acessos.data ?? [])
          .filter(a => !a.expira_em || new Date(a.expira_em).getTime() > agora)
          .map(a => a.curso_id as string),
      );
      const feitas = new Set((progresso.data ?? []).map(p => p.aula_id as string));

      type Bruto = Curso & { curso_modulos: { id: string; curso_aulas: { id: string }[] | null }[] | null };
      setCursos(((lista.data ?? []) as Bruto[]).map(({ curso_modulos, ...c }) => {
        const ids = (curso_modulos ?? []).flatMap(m => (m.curso_aulas ?? []).map(a => a.id));
        return {
          ...c,
          totalAulas: ids.length,
          concluidas: ids.filter(id => feitas.has(id)).length,
          temAcesso: liberados.has(c.id),
        };
      }));
      setCarregando(false);
    })();

    return () => { ativo = false; };
  }, [userId]);

  return { cursos, carregando, erro };
}

// ───────────────────────────────────────────────────────────────
// Um curso inteiro, com o progresso da aluna
// ───────────────────────────────────────────────────────────────

export function useCurso(slug: string | undefined) {
  const { userId } = useAuth();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<ModuloComAulas[]>([]);
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [temAcesso, setTemAcesso] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !slug) return;
    let ativo = true;
    setCarregando(true);

    (async () => {
      const { data, error } = await supabase.from('cursos')
        .select(`${CAMPOS_CURSO}, curso_modulos(id, curso_id, titulo, descricao, ordem, curso_aulas(${CAMPOS_AULA}))`)
        .eq('slug', slug)
        .maybeSingle();
      if (!ativo) return;

      if (error || !data) {
        if (error) console.error('Falha ao abrir o curso:', error.message);
        setErro(error ? 'Não consegui abrir este curso agora.' : 'Este curso não existe ou ainda não foi publicado.');
        setCarregando(false);
        return;
      }

      const { curso_modulos, ...c } = data as Curso & { curso_modulos: ModuloBruto[] | null };
      const mods = montarModulos(curso_modulos);
      const ids = aulasEmOrdem(mods).map(a => a.id);

      const [acesso, prog] = await Promise.all([
        supabase.rpc('tem_acesso_ao_curso', { p_curso_id: c.id }),
        ids.length
          ? supabase.from('curso_progresso')
              .select('aula_id, posicao_seg, concluida_em')
              .eq('user_id', userId)
              .in('aula_id', ids)
          : Promise.resolve({ data: [] as Progresso[], error: null }),
      ]);
      if (!ativo) return;

      if (acesso.error) console.error('Falha ao checar o acesso:', acesso.error.message);
      if (prog.error) console.error('Falha ao ler o progresso:', prog.error.message);

      setCurso(c);
      setModulos(mods);
      setTemAcesso(acesso.data === true);
      setProgresso((prog.data ?? []) as Progresso[]);
      setErro(null);
      setCarregando(false);
    })();

    return () => { ativo = false; };
  }, [userId, slug]);

  /**
   * Guarda onde a aluna está. Uma vez concluída, a aula continua
   * concluída: rever o começo não desmarca nada.
   */
  const registrarPosicao = useCallback(async (aulaId: string, posicao: number, duracao: number) => {
    if (!userId) return;
    const concluir = deveConcluir(posicao, duracao);
    const jaConcluida = progresso.some(p => p.aula_id === aulaId && p.concluida_em);

    const linha: Record<string, unknown> = {
      user_id: userId,
      aula_id: aulaId,
      posicao_seg: posicao,
      atualizado_em: new Date().toISOString(),
    };
    if (concluir && !jaConcluida) linha.concluida_em = new Date().toISOString();

    const { error } = await supabase.from('curso_progresso').upsert(linha, { onConflict: 'user_id,aula_id' });
    if (error) {
      console.error('Falha ao guardar o progresso:', error.message);
      return;
    }

    setProgresso(atual => {
      const resto = atual.filter(p => p.aula_id !== aulaId);
      const anterior = atual.find(p => p.aula_id === aulaId);
      return [...resto, {
        aula_id: aulaId,
        posicao_seg: posicao,
        concluida_em: anterior?.concluida_em ?? (linha.concluida_em as string | undefined) ?? null,
      }];
    });
  }, [userId, progresso]);

  /** Marcar ou desmarcar à mão, pelo botão da aula. */
  const alternarConcluida = useCallback(async (aulaId: string) => {
    if (!userId) return;
    const atual = progresso.find(p => p.aula_id === aulaId);
    const concluida_em = atual?.concluida_em ? null : new Date().toISOString();

    const { error } = await supabase.from('curso_progresso').upsert({
      user_id: userId,
      aula_id: aulaId,
      posicao_seg: atual?.posicao_seg ?? 0,
      concluida_em,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'user_id,aula_id' });

    if (error) {
      console.error('Falha ao marcar a aula:', error.message);
      return;
    }

    setProgresso(lista => [
      ...lista.filter(p => p.aula_id !== aulaId),
      { aula_id: aulaId, posicao_seg: atual?.posicao_seg ?? 0, concluida_em },
    ]);
  }, [userId, progresso]);

  return { curso, modulos, progresso, temAcesso, carregando, erro, registrarPosicao, alternarConcluida };
}

// ───────────────────────────────────────────────────────────────
// O vídeo de uma aula
// ───────────────────────────────────────────────────────────────

export interface VideoDaAula {
  provedor: Provedor;
  video_id: string;
}

/**
 * null quando a aluna não pode assistir: a RLS simplesmente não devolve
 * a linha, e a tela mostra a aula trancada.
 */
export function useVideoDaAula(aulaId: string | undefined) {
  const [video, setVideo] = useState<VideoDaAula | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!aulaId) return;
    let ativo = true;
    setCarregando(true);
    setVideo(null);

    supabase.from('curso_aula_videos')
      .select('provedor, video_id')
      .eq('aula_id', aulaId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error('Falha ao buscar o vídeo:', error.message);
        setVideo((data as VideoDaAula | null) ?? null);
        setCarregando(false);
      });

    return () => { ativo = false; };
  }, [aulaId]);

  return { video, carregando };
}

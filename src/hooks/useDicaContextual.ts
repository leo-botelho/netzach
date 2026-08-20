import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { escolherDica, type Dica, type DiaRegistrado } from '../lib/dicasContextuais';
import { calculateCycleStatus } from '../utils/mysticMath';

/**
 * A dica contextual do dia (§7 do documento).
 *
 * Lê os últimos dias de check-in e hábitos, reconhece o padrão e
 * entrega no máximo uma mensagem por dia. Uma vez escolhida, a dica do
 * dia fica registrada: não muda se a usuária recarregar a tela, e não
 * volta depois de dispensada.
 */

const DIAS_ANALISADOS = 4;

function dataLocal(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDias);
  return d.toISOString().split('T')[0];
}

interface Retorno {
  dica: Dica | null;
  carregando: boolean;
  dispensar: () => Promise<void>;
}

export function useDicaContextual(): Retorno {
  const { userId, carregando: carregandoSessao } = useAuth();
  const [dica, setDica] = useState<Dica | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (carregandoSessao) return;
    if (!userId) { setCarregando(false); return; }

    let ativo = true;

    (async () => {
      const hoje = dataLocal();
      const desde = dataLocal(DIAS_ANALISADOS);

      const [entregaHoje, checkins, habitos, perfil] = await Promise.all([
        supabase.from('contextual_tips')
          .select('trigger_key, dismissed').eq('user_id', userId).eq('date', hoje).maybeSingle(),
        supabase.from('daily_checkins')
          .select('date, period, sleep_quality, mood, emotion, mind, energy, intention, alignment, release_notes, gratitude')
          .eq('user_id', userId).gte('date', desde).order('date', { ascending: false }),
        supabase.from('habit_logs')
          .select('date, habit').eq('user_id', userId).gte('date', desde),
        supabase.from('profiles')
          .select('last_period_date, cycle_duration').eq('user_id', userId).maybeSingle(),
      ]);

      if (!ativo) return;

      // Já houve entrega hoje: mantém a mesma, ou nada se foi lida.
      if (entregaHoje.data) {
        if (!entregaHoje.data.dismissed) {
          const { GATILHOS } = await import('../lib/dicasContextuais');
          const guardada = GATILHOS.find(g => g.dica.chave === entregaHoje.data!.trigger_key);
          if (ativo) setDica(guardada?.dica ?? null);
        }
        if (ativo) setCarregando(false);
        return;
      }

      // Junta manhã e noite de cada data num único registro.
      const porData = new Map<string, DiaRegistrado>();
      for (const linha of checkins.data ?? []) {
        const atual: DiaRegistrado =
          porData.get(linha.date) ?? { date: linha.date, textos: [], habitos: [] };
        porData.set(linha.date, {
          ...atual,
          sleep_quality: linha.sleep_quality ?? atual.sleep_quality,
          mood: linha.mood ?? atual.mood,
          emotion: linha.emotion ?? atual.emotion,
          mind: linha.mind ?? atual.mind,
          energy: linha.energy ?? atual.energy,
          textos: [
            ...(atual.textos ?? []),
            linha.intention, linha.alignment, linha.release_notes, linha.gratitude,
          ].filter(Boolean) as string[],
        });
      }

      for (const linha of habitos.data ?? []) {
        const atual: DiaRegistrado =
          porData.get(linha.date) ?? { date: linha.date, textos: [], habitos: [] };
        atual.habitos = [...(atual.habitos ?? []), linha.habit];
        porData.set(linha.date, atual);
      }

      const dias = [...porData.values()].sort((a, b) => b.date.localeCompare(a.date));

      const ciclo = perfil.data?.last_period_date
        ? calculateCycleStatus(perfil.data.last_period_date, perfil.data.cycle_duration ?? 28)
        : null;

      const escolhida = escolherDica({
        dias,
        faseCiclo: ciclo?.phaseName ?? null,
        diaDoCiclo: ciclo?.dayOfCycle ?? null,
        duracaoCiclo: perfil.data?.cycle_duration ?? 28,
      });

      if (!ativo) return;

      if (escolhida) {
        // Registra antes de mostrar: assim a dica do dia é sempre a
        // mesma, mesmo que a usuária abra o app várias vezes.
        const { error } = await supabase.from('contextual_tips').insert({
          user_id: userId, date: hoje, trigger_key: escolhida.chave,
        });
        // 23505 = outra aba registrou primeiro; não é problema.
        if (error && error.code !== '23505') {
          console.error('Falha ao registrar a dica do dia:', error.message);
        }
        if (ativo) setDica(escolhida);
      }

      if (ativo) setCarregando(false);
    })();

    return () => { ativo = false; };
  }, [userId, carregandoSessao]);

  const dispensar = useCallback(async () => {
    setDica(null);
    if (!userId) return;
    await supabase.from('contextual_tips')
      .update({ dismissed: true })
      .eq('user_id', userId).eq('date', dataLocal());
  }, [userId]);

  return { dica, carregando, dispensar };
}

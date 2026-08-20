import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

export function useSaveToGrimorio(module: string) {
  const { userId } = useAuth();
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const reset = () => { setSaved(false); setErro(null); };

  const saveToGrimorio = async (response: string, prompt?: string) => {
    if (saved || !response || !userId) return;

    const { error } = await supabase.from('sacerdotisa_history').insert({
      user_id: userId,
      module,
      prompt: prompt ?? null,
      response,
      saved: true,
    });

    // Antes a falha era silenciosa: o botão simplesmente não mudava e
    // a usuária não sabia se tinha guardado ou não.
    if (error) {
      console.error('Falha ao salvar no grimório:', error.message);
      setErro('Não consegui guardar agora. Tente de novo em instantes.');
      return;
    }
    setSaved(true);
  };

  return { saved, erro, saveToGrimorio, reset };
}

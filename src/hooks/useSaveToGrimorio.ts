import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSaveToGrimorio(module: string) {
  const [saved, setSaved] = useState(false);

  const reset = () => setSaved(false);

  const saveToGrimorio = async (response: string, prompt?: string) => {
    if (saved || !response) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from('sacerdotisa_history').insert({
      user_id: session.user.id,
      module,
      prompt: prompt ?? null,
      response,
      saved: true,
    });
    if (!error) setSaved(true);
  };

  return { saved, saveToGrimorio, reset };
}

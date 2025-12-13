import { createClient } from '@supabase/supabase-js';

// Assegure-se de criar um arquivo .env na raiz do projeto com essas variáveis
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltam variáveis de ambiente do Supabase (.env)');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
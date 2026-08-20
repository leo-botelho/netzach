import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// O app exige as variáveis do Supabase no import de lib/supabase.
vi.stubEnv('VITE_SUPABASE_URL', 'https://teste.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-de-teste');

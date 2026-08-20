import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // As edge functions rodam em Deno, com outro conjunto de globais e
  // outro tsconfig. Analisá-las com as regras do navegador produzia
  // erros que não fazem sentido ali (o `@ts-ignore` do import npm, por
  // exemplo, é a forma correta em Deno).
  globalIgnores(['dist', 'supabase/functions/**', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      /**
       * Duas regras do React Compiler, trazidas como erro pelo
       * eslint-plugin-react-hooks 7, ficam como aviso.
       *
       * `set-state-in-effect` aponta o padrão de buscar dados num
       * efeito e guardar o resultado no estado, que é como o portal
       * inteiro funciona. A correção estrutural é adotar uma camada de
       * dados com cache (TanStack Query), que está no roadmap; até lá,
       * transformar isso em erro só faria a verificação ficar vermelha
       * sem nada a fazer a respeito.
       *
       * `immutability`, no caso "acessado antes de ser declarado",
       * marca efeitos declarados acima das funções que chamam. Funciona
       * porque o efeito só roda depois da montagem. Foi corrigido onde
       * era barato (AdminPanel, MatrizMandala); o resto fica visível
       * como aviso.
       *
       * O React Compiler não está em uso neste projeto.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
])

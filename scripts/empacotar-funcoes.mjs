/**
 * Gera, para cada edge function, UM arquivo só, com o código de `_shared`
 * embutido, para colar no editor do painel do Supabase.
 *
 * Por quê: o editor do painel envia só o arquivo da função. As funções
 * importam de `../_shared/`, uma pasta ao lado, então o painel publica e
 * falha com "Module not found ... _shared/auth.ts". O CLI (`supabase
 * functions deploy`) enxerga a pasta; o painel não.
 *
 * Uso:
 *   node scripts/empacotar-funcoes.mjs              (todas as funções)
 *   node scripts/empacotar-funcoes.mjs sacerdotisa  (só as citadas)
 *
 * Saída: funcoes-para-colar/<função>/index.ts. Não edite esses arquivos:
 * edite os fontes em supabase/functions e gere de novo. A pasta de saída
 * está no .gitignore.
 *
 * Os imports `npm:` e `jsr:` ficam como estão, porque é o Deno do
 * Supabase quem os resolve.
 */

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const funcoes = join(raiz, 'supabase', 'functions');
const saida = join(raiz, 'funcoes-para-colar');

// O esbuild já vem como dependência do Vite: resolve a partir dele, sem
// precisar declará-lo no projeto.
const req = createRequire(join(raiz, 'package.json'));
const esbuild = createRequire(req.resolve('vite/package.json'))('esbuild');

const pedidas = process.argv.slice(2);
const todas = readdirSync(funcoes, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== '_shared' && existsSync(join(funcoes, d.name, 'index.ts')))
  .map(d => d.name);

const alvo = pedidas.length ? pedidas : todas;
const desconhecidas = alvo.filter(n => !todas.includes(n));
if (desconhecidas.length) {
  console.error(`Função não encontrada: ${desconhecidas.join(', ')}\nExistem: ${todas.join(', ')}`);
  process.exit(1);
}

rmSync(saida, { recursive: true, force: true });

for (const nome of alvo) {
  const r = await esbuild.build({
    entryPoints: [join(funcoes, nome, 'index.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    target: 'esnext',
    // Resolvidos pelo Deno no servidor do Supabase, não aqui.
    external: ['npm:*', 'jsr:*'],
    legalComments: 'none',
    logLevel: 'silent',
  });

  const cabecalho =
    `// GERADO por scripts/empacotar-funcoes.mjs a partir de supabase/functions/${nome}.\n` +
    `// Não edite aqui: edite os fontes e gere de novo.\n\n`;

  const pasta = join(saida, nome);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'index.ts'), cabecalho + r.outputFiles[0].text);

  const kb = (r.outputFiles[0].text.length / 1024).toFixed(1);
  console.log(`  ${nome.padEnd(26)} ${kb.padStart(7)} KB  -> funcoes-para-colar/${nome}/index.ts`);
}

console.log(`\n${alvo.length} função(ões) empacotada(s). Cole o conteúdo de cada index.ts no editor do painel.`);

/**
 * Cifra das chaves de API guardadas no banco.
 *
 * As chaves de OpenAI, Claude, Gemini e DeepSeek cadastradas no painel
 * ficam no banco, e quem tem acesso ao banco (um backup, um dump, uma
 * pessoa com permissão de leitura) não pode ler a chave de ninguém. Por
 * isso são cifradas com AES-256-GCM antes de gravar, com um segredo que
 * mora só nos segredos da função (`IA_ENCRYPTION_KEY`), nunca no banco.
 *
 * O "contexto" (o nome da plataforma) entra como dado autenticado: um
 * valor cifrado para a OpenAI não decifra se for colado na linha do
 * Gemini, o que impede trocar chaves de lugar no banco.
 *
 * Formato guardado: `v1.<iv>.<texto cifrado>`, em base64url.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function paraBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

/** Um segredo curto demais é fácil de adivinhar: recusa em vez de cifrar mal. */
export function segredoDeCifraValido(segredo: string | null | undefined): segredo is string {
  return typeof segredo === 'string' && segredo.trim().length >= 24;
}

async function chaveDoSegredo(segredo: string): Promise<CryptoKey> {
  // SHA-256 dá 32 bytes de qualquer segredo, que é o tamanho do AES-256.
  const bruto = await crypto.subtle.digest('SHA-256', enc.encode(segredo.trim()));
  return crypto.subtle.importKey('raw', bruto, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function cifrar(texto: string, segredo: string, contexto: string): Promise<string> {
  if (!segredoDeCifraValido(segredo)) throw new Error('Segredo de cifra ausente ou curto demais');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(contexto) },
    await chaveDoSegredo(segredo),
    enc.encode(texto),
  );
  return `v1.${paraBase64Url(iv)}.${paraBase64Url(new Uint8Array(cifrado))}`;
}

/** Lança erro se o valor foi alterado, se o segredo é outro ou se o contexto não bate. */
export async function decifrar(valor: string, segredo: string, contexto: string): Promise<string> {
  if (!segredoDeCifraValido(segredo)) throw new Error('Segredo de cifra ausente ou curto demais');

  const [versao, ivB64, cifradoB64] = valor.split('.');
  if (versao !== 'v1' || !ivB64 || !cifradoB64) throw new Error('Formato de chave cifrada desconhecido');

  const aberto = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: deBase64Url(ivB64), additionalData: enc.encode(contexto) },
    await chaveDoSegredo(segredo),
    deBase64Url(cifradoB64),
  );
  return dec.decode(aberto);
}

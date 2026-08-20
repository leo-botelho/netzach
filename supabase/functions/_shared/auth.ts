import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Autenticação e CORS compartilhados pelas edge functions.
 *
 * Antes cada função repetia (ou omitia) essa lógica: das oito, só a
 * sacerdotisa checava quem estava chamando. As demais aceitavam o
 * user_id pelo corpo da requisição, ou nem isso.
 */

/**
 * Origens permitidas. Configure com:
 *   supabase secrets set ALLOWED_ORIGINS="https://netzach.app,https://www.netzach.app"
 * Sem a variável, mantém '*' — o comportamento anterior — para não
 * derrubar produção antes de a lista estar definida.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const permitidas = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',').map(o => o.trim()).filter(Boolean);

  const origem = req.headers.get('Origin') ?? '';
  const valor = permitidas.length === 0
    ? '*'
    : (permitidas.includes(origem) ? origem : permitidas[0]);

  return {
    'Access-Control-Allow-Origin': valor,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function servico(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export function erro(req: Request, status: number, mensagem: string): Response {
  return new Response(JSON.stringify({ error: mensagem }), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export interface Autenticado {
  id: string;
  email?: string;
}

/**
 * Resolve a usuária a partir do token. Devolve `{ resposta }` quando a
 * requisição deve ser recusada, para o chamador retornar direto.
 */
export async function exigirUsuaria(
  req: Request,
  supabase: SupabaseClient
): Promise<{ usuaria: Autenticado } | { resposta: Response }> {
  const header = req.headers.get('Authorization');
  if (!header) return { resposta: erro(req, 401, 'Autenticação necessária') };

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    header.replace('Bearer ', '')
  );
  if (authError || !user) return { resposta: erro(req, 401, 'Sessão inválida') };

  return { usuaria: { id: user.id, email: user.email } };
}

/**
 * Como acima, mas exige profiles.role = 'admin'.
 *
 * O painel administrativo checava isso apenas no navegador, o que não
 * protege o endpoint: bastava chamar a função direto.
 */
export async function exigirAdmin(
  req: Request,
  supabase: SupabaseClient
): Promise<{ usuaria: Autenticado } | { resposta: Response }> {
  const auth = await exigirUsuaria(req, supabase);
  if ('resposta' in auth) return auth;

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', auth.usuaria.id)
    .maybeSingle();

  if (perfil?.role !== 'admin') {
    return { resposta: erro(req, 403, 'Acesso restrito') };
  }
  return auth;
}

/**
 * Chamadas máquina-a-máquina (cron do Postgres, um webhook chamando
 * outra função) apresentam este segredo em vez de um token de usuária.
 *
 *   supabase secrets set INTERNAL_TASK_SECRET="<valor aleatório longo>"
 */
export function segredoInternoValido(req: Request): boolean {
  const esperado = Deno.env.get('INTERNAL_TASK_SECRET');
  if (!esperado) return false;
  return req.headers.get('x-internal-secret') === esperado;
}

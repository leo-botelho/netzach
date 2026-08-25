import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Moon, Star, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mensagemDoErroDeSenha, podeTentarDeNovo } from '../lib/erroDeSenha';

/**
 * Definição da nova senha.
 *
 * Chegando pelo link do email, o Supabase já criou uma sessão de
 * recuperação: por isso a tela não pede a senha antiga. Se não houver
 * sessão, o link expirou ou já foi usado.
 */

const MINIMO = 8;

export default function NovaSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkValido, setLinkValido] = useState<boolean | null>(null);

  useEffect(() => {
    // O Supabase troca o código do link por uma sessão. Isso acontece
    // logo depois da montagem, então vale escutar em vez de checar uma
    // vez só.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'PASSWORD_RECOVERY' || sessao) setLinkValido(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      setLinkValido(atual => atual ?? Boolean(data.session));
    });

    return () => subscription.unsubscribe();
  }, []);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.length < MINIMO) {
      return setErro(`A senha precisa de pelo menos ${MINIMO} caracteres.`);
    }
    if (senha !== confirmacao) {
      return setErro('As duas senhas precisam ser iguais.');
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      console.error('Falha ao trocar a senha:', error.message);
      setErro(mensagemDoErroDeSenha(error));
      // Link gasto é a única falha que não adianta insistir daqui.
      if (!podeTentarDeNovo(error)) setLinkValido(false);
      return;
    }

    navigate('/templo');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-10 left-10 text-netzach-gold opacity-20 animate-pulse"><Star size={24} /></div>
        <div className="absolute bottom-20 right-20 text-netzach-gold opacity-20 animate-pulse delay-700"><Star size={16} /></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-netzach-accent rounded-full blur-[120px] opacity-10" />
      </div>

      <div className="bg-netzach-card p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-sm border border-netzach-border relative z-10 backdrop-blur-sm">

        {linkValido === null && (
          <p className="text-center text-netzach-muted animate-pulse font-mystic py-6">Sintonizando...</p>
        )}

        {linkValido === false && (
          <div className="text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">🌙</div>
            <h1 className="text-2xl font-mystic text-netzach-gold">Este caminho já se fechou</h1>
            <p className="text-sm text-netzach-muted leading-relaxed">
              O link tem validade de uma hora e só funciona uma vez. Peça um novo, que chega
              em instantes.
            </p>
            <Link to="/esqueci-senha"
              className="block w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-lg hover:bg-white transition-colors">
              Pedir um novo link
            </Link>
          </div>
        )}

        {linkValido === true && (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4 text-netzach-gold">
                <Moon size={44} strokeWidth={1} />
              </div>
              <h1 className="text-2xl font-mystic font-bold text-netzach-gold">Sua nova senha</h1>
              <p className="text-netzach-muted text-sm mt-2">
                Escolha uma que você guarde com carinho.
              </p>
            </div>

            <form onSubmit={salvar} className="space-y-5">
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder={`Nova senha, mínimo ${MINIMO} caracteres`}
                  className="w-full pl-10 p-3 bg-netzach-deep border border-netzach-border rounded-lg focus:border-netzach-gold focus:ring-1 focus:ring-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
              </div>

              <div className="relative group">
                <Check className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Repita para confirmar"
                  className="w-full pl-10 p-3 bg-netzach-deep border border-netzach-border rounded-lg focus:border-netzach-gold focus:ring-1 focus:ring-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
                  value={confirmacao}
                  onChange={e => setConfirmacao(e.target.value)}
                />
              </div>

              {erro && <p role="alert" className="text-sm text-netzach-rose">{erro}</p>}

              <button
                type="submit"
                disabled={salvando || !senha || !confirmacao}
                className="w-full bg-gradient-to-r from-netzach-border to-netzach-card border border-netzach-gold text-netzach-gold p-3 rounded-lg font-mystic font-bold hover:bg-netzach-gold hover:text-netzach-bg transition-all disabled:opacity-50"
              >
                {salvando ? 'Guardando...' : 'Guardar e entrar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

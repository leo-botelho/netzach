import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Moon, Star, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Pedido de nova senha.
 *
 * A resposta é sempre a mesma, exista a conta ou não: dizer "este email
 * não está cadastrado" entregaria a qualquer pessoa a informação de
 * quem é assinante do portal.
 */
export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pedirRedefinicao = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setEnviando(true);
    setErro(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-senha`,
    });

    setEnviando(false);

    // Erro de rede a usuária precisa saber; "email não existe" não.
    if (error && error.status !== 400) {
      console.error('Falha ao pedir redefinição:', error.message);
      setErro('Não consegui enviar agora. Tente de novo em instantes.');
      return;
    }

    setEnviado(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-10 left-10 text-netzach-gold opacity-20 animate-pulse"><Star size={24} /></div>
        <div className="absolute bottom-20 right-20 text-netzach-gold opacity-20 animate-pulse delay-700"><Star size={16} /></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-netzach-accent rounded-full blur-[120px] opacity-10" />
      </div>

      <div className="bg-netzach-card p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-sm border border-netzach-border relative z-10 backdrop-blur-sm">

        {enviado ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center text-netzach-gold"><Mail size={44} strokeWidth={1} /></div>
            <h1 className="text-2xl font-mystic text-netzach-gold">Enviado</h1>
            <p className="text-sm text-netzach-muted leading-relaxed">
              Se houver uma conta com esse endereço, o caminho de volta chega em instantes.
              Confira também a caixa de spam.
            </p>
            <p className="text-xs text-netzach-muted/70">
              O link vale por uma hora.
            </p>
            <Link to="/portal"
              className="block w-full border border-netzach-border text-netzach-muted py-3 rounded-lg hover:text-white transition-colors text-sm">
              Voltar para a entrada
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4 text-netzach-gold">
                <Moon size={44} strokeWidth={1} />
              </div>
              <h1 className="text-2xl font-mystic font-bold text-netzach-gold">Recuperar acesso</h1>
              <p className="text-netzach-muted text-sm mt-2 leading-relaxed">
                Acontece com todas nós. Escreva seu email que eu envio o caminho de volta.
              </p>
            </div>

            <form onSubmit={pedirRedefinicao} className="space-y-5">
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Seu e-mail de iniciada"
                  className="w-full pl-10 p-3 bg-netzach-deep border border-netzach-border rounded-lg focus:border-netzach-gold focus:ring-1 focus:ring-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              {erro && <p role="alert" className="text-sm text-netzach-rose">{erro}</p>}

              <button
                type="submit"
                disabled={enviando || !email.trim()}
                className="w-full bg-gradient-to-r from-netzach-border to-netzach-card border border-netzach-gold text-netzach-gold p-3 rounded-lg font-mystic font-bold hover:bg-netzach-gold hover:text-netzach-bg transition-all disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Enviar o caminho de volta'}
              </button>
            </form>

            <Link to="/portal"
              className="flex items-center justify-center gap-1.5 mt-6 text-xs text-netzach-muted hover:text-netzach-gold transition-colors">
              <ArrowLeft size={13} /> Lembrei minha senha
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

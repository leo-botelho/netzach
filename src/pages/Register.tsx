import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Moon, Loader2 } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { full_name: formData.name } // Envia nome para o Trigger criar o perfil
      }
    });

    setLoading(false);

    if (error) {
      alert('As estrelas não se alinharam: ' + error.message);
    } else {
      // --- AQUI ESTÁ A MUDANÇA ---
      alert(
        '✨ Cadastro Realizado com Sucesso! ✨\n\n' +
        'Enviamos um link de confirmação para o seu e-mail.\n' +
        '⚠️ IMPORTANTE: Verifique também sua caixa de SPAM ou Lixo Eletrônico.\n\n' +
        'Confirme seu e-mail para abrir o portal.'
      );
      navigate('/portal'); // Manda para o login para ela entrar após confirmar
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-netzach-bg p-4 relative font-sans text-netzach-text">
      
      {/* Background Stars (Opcional, mantém a consistência) */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-10 right-10 w-1 h-1 bg-netzach-gold rounded-full animate-pulse"></div>
         <div className="absolute bottom-20 left-20 w-1 h-1 bg-netzach-gold rounded-full animate-pulse delay-100"></div>
      </div>

      <div className="bg-netzach-card p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-sm border border-netzach-border relative z-10 backdrop-blur-sm">
        
        <div className="text-center mb-10">
          <Moon size={40} className="mx-auto text-netzach-gold mb-4 animate-pulse" strokeWidth={1} />
          <h1 className="text-2xl font-mystic font-bold text-netzach-gold">Junte-se ao Círculo</h1>
          <p className="text-netzach-muted text-xs mt-2 uppercase tracking-widest">Crie seu acesso ao Templo</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="relative group">
            <User className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
            <input
              type="text"
              placeholder="Seu Nome Místico"
              className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
            <input
              type="email"
              placeholder="Seu Melhor E-mail"
              className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
            <input
              type="password"
              placeholder="Senha Secreta"
              className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          
          <button 
            disabled={loading}
            className="w-full bg-netzach-gold text-netzach-bg p-3 rounded-lg font-mystic font-bold hover:bg-white transition-all disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(197,160,89,0.1)] hover:shadow-[0_0_20px_rgba(197,160,89,0.3)]"
          >
            {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Confirmar Iniciação'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs border-t border-netzach-border pt-6">
          <p className="text-netzach-muted">Já é uma iniciada?</p>
          <Link to="/portal" className="text-netzach-gold hover:underline mt-1 block uppercase tracking-wider">Acessar Portal</Link>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Moon, Star } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert('As estrelas não se alinharam: ' + error.message);
    } else {
      navigate('/templo'); // Redireciona para o novo Dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-10 left-10 text-netzach-gold opacity-20 animate-pulse"><Star size={24}/></div>
        <div className="absolute bottom-20 right-20 text-netzach-gold opacity-20 animate-pulse delay-700"><Star size={16}/></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-netzach-accent rounded-full blur-[120px] opacity-10"></div>
      </div>

      <div className="bg-netzach-card p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-sm border border-netzach-border relative z-10 backdrop-blur-sm">
        
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4 text-netzach-gold">
            <Moon size={48} strokeWidth={1} />
          </div>
          <h1 className="text-3xl font-mystic font-bold text-netzach-gold">Portal Netzach</h1>
          <p className="text-netzach-muted text-sm mt-2 font-light tracking-widest uppercase">Inicie sua jornada</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
            <input
              type="email"
              placeholder="Seu e-mail de iniciada"
              className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold focus:ring-1 focus:ring-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-netzach-muted group-focus-within:text-netzach-gold transition-colors" size={18} />
            <input
              type="password"
              placeholder="Sua senha secreta"
              className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold focus:ring-1 focus:ring-netzach-gold outline-none transition-all placeholder-netzach-muted/50 text-netzach-text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-gradient-to-r from-netzach-border to-netzach-card border border-netzach-gold text-netzach-gold p-3 rounded-lg font-mystic font-bold hover:bg-netzach-gold hover:text-netzach-bg transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(197,160,89,0.1)] hover:shadow-[0_0_20px_rgba(197,160,89,0.4)]"
          >
            {loading ? 'Abrindo o Portal...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
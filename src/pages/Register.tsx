import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Moon, Loader2, Calendar, Phone, Clock, MapPin } from 'lucide-react';
import { getSunSign } from '../utils/mysticMath';

export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Estado para controlar se tem ciclo
  const [hasCycle, setHasCycle] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    password: '',
    birthDate: '',
    birthTime: '',
    birthCity: '', // Novo
    lastPeriod: '',
    cycleDays: '28',
    periodDays: '5'
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const sign = getSunSign(formData.birthDate);

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { 
          full_name: formData.name,
          whatsapp: formData.whatsapp,
          birth_date: formData.birthDate,
          birth_time: formData.birthTime,
          birth_city: formData.birthCity,
          sign_sun: sign,
          // Se não tiver ciclo, envia vazio para o banco salvar NULL
          last_period_date: hasCycle ? formData.lastPeriod : '',
          cycle_duration: hasCycle ? formData.cycleDays : '',
          period_duration: hasCycle ? formData.periodDays : ''
        }
      }
    });

    setLoading(false);

    if (error) {
      alert('Erro: ' + error.message);
    } else {
      alert(`Bem-vinda, ${sign}! ✨\nVerifique seu e-mail para confirmar a entrada no Templo.`);
      navigate('/portal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-netzach-bg p-4 font-sans text-netzach-text">
      <div className="bg-netzach-card p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-netzach-border relative backdrop-blur-sm">
        
        <div className="text-center mb-6">
          <Moon size={32} className="mx-auto text-netzach-gold mb-2 animate-pulse" strokeWidth={1} />
          <h1 className="text-xl font-mystic font-bold text-netzach-gold">Iniciação</h1>
          <p className="text-netzach-muted text-xs uppercase tracking-widest">Passo {step} de 2</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="relative group">
                <User className="absolute left-3 top-3.5 text-netzach-muted" size={18} />
                <input placeholder="Nome de Batismo Completo" className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 text-netzach-muted" size={18} />
                <input type="email" placeholder="Seu Melhor E-mail" className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="relative group">
                <Phone className="absolute left-3 top-3.5 text-netzach-muted" size={18} />
                <input type="tel" placeholder="WhatsApp (DDD + Número)" className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none transition-all" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} required />
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-netzach-muted" size={18} />
                <input type="password" placeholder="Crie sua Senha Secreta" className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
              </div>
              <button type="button" onClick={() => setStep(2)} disabled={!formData.name || !formData.email || !formData.whatsapp || !formData.password} className="w-full bg-netzach-accent text-white p-3 rounded-lg font-bold hover:bg-purple-800 transition-all disabled:opacity-50 mt-2">Continuar</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-netzach-gold uppercase font-bold mb-1 block">Nascimento</label>
                    <div className="relative">
                        <Calendar className="absolute left-2 top-2.5 text-netzach-muted" size={14} />
                        <input type="date" className="w-full pl-7 p-2 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-xs text-white/90" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} required />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-netzach-gold uppercase font-bold mb-1 block">Horário</label>
                    <div className="relative">
                        <Clock className="absolute left-2 top-2.5 text-netzach-muted" size={14} />
                        <input type="time" className="w-full pl-7 p-2 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-xs text-white/90" value={formData.birthTime} onChange={e => setFormData({...formData, birthTime: e.target.value})} required />
                    </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-netzach-gold uppercase font-bold mb-1 block">Cidade de Nascimento</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 text-netzach-muted" size={16} />
                    <input type="text" placeholder="Cidade - Estado" className="w-full pl-9 p-3 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-sm" value={formData.birthCity} onChange={e => setFormData({...formData, birthCity: e.target.value})} required />
                </div>
              </div>

              <div className="border-t border-netzach-border pt-2">
                 <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="noCycle" checked={!hasCycle} onChange={(e) => setHasCycle(!e.target.checked)} className="accent-netzach-gold w-4 h-4"/>
                    <label htmlFor="noCycle" className="text-xs text-netzach-muted cursor-pointer select-none">Não acompanho ciclo menstrual (Menopausa/Outros)</label>
                 </div>

                 {hasCycle && (
                    <div className="space-y-3 animate-in fade-in">
                        <div>
                            <label className="text-xs text-netzach-gold uppercase font-bold mb-1 block">Última Menstruação</label>
                            <input type="date" className="w-full p-2 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-white/80" value={formData.lastPeriod} onChange={e => setFormData({...formData, lastPeriod: e.target.value})} required={hasCycle} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] text-netzach-muted uppercase font-bold">Ciclo (Dias)</label><input type="number" placeholder="28" className="w-full p-2 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-center" value={formData.cycleDays} onChange={e => setFormData({...formData, cycleDays: e.target.value})} required={hasCycle} /></div>
                            <div><label className="text-[10px] text-netzach-muted uppercase font-bold">Sangramento</label><input type="number" placeholder="5" className="w-full p-2 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-center" value={formData.periodDays} onChange={e => setFormData({...formData, periodDays: e.target.value})} required={hasCycle} /></div>
                        </div>
                    </div>
                 )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-transparent border border-netzach-border text-netzach-muted p-3 rounded-lg font-bold hover:text-white text-sm">Voltar</button>
                <button disabled={loading} className="flex-[2] bg-netzach-gold text-netzach-bg p-3 rounded-lg font-mystic font-bold hover:bg-white transition-all disabled:opacity-50 text-sm">{loading ? <Loader2 className="animate-spin mx-auto"/> : 'Finalizar Iniciação'}</button>
              </div>
            </div>
          )}
        </form>
        <div className="mt-6 text-center text-xs border-t border-netzach-border pt-4">
            <Link to="/portal" className="text-netzach-muted hover:text-netzach-gold transition-colors">Já tenho acesso</Link>
        </div>
      </div>
    </div>
  );
}
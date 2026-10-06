import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Star, Moon, Sparkles, ArrowLeft, Sun } from 'lucide-react';

export default function Oracle() {
  const navigate = useNavigate();
  const [userSign, setUserSign] = useState<string>('');
  const [weeklyPrediction, setWeeklyPrediction] = useState<string>('');
  const [skyOfTheWeek, setSkyOfTheWeek] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOracle();
  }, []);

  const loadOracle = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');

    // 1. Pega o signo da usuária
    const { data: profile } = await supabase.from('profiles').select('sign_sun').eq('user_id', session.user.id).single();
    
    if (profile?.sign_sun) {
        setUserSign(profile.sign_sun);
        
        // 2. Busca previsão para o signo dela
        const { data: prediction } = await supabase
            .from('horoscopes')
            .select('content')
            .eq('sign', profile.sign_sun.toLowerCase()) // Normaliza para minúsculo para bater com o banco
            .eq('type', 'sign_weekly')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (prediction) setWeeklyPrediction(prediction.content);
    }

    // 3. Busca o Céu da Semana (Geral)
    // Nota: O 'sign' no banco deve ser salvo como 'ceu_semana' ou 'geral' pelo Admin
    const { data: sky } = await supabase
        .from('horoscopes')
        .select('content')
        .or('sign.eq.geral,sign.eq.ceu_semana') // Tenta encontrar geral ou ceu_semana
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (sky) setSkyOfTheWeek(sky.content);
    
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic">Consultando os astros...</div>;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text pb-24 p-6 font-sans">
        <header className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-mystic text-netzach-gold">Oráculo</h1>
            <button onClick={() => navigate('/templo')} className="text-sm text-netzach-muted hover:text-white flex items-center gap-2">
                <ArrowLeft size={16}/> Voltar
            </button>
        </header>

        <div className="space-y-8 max-w-lg mx-auto">
            
            {/* Céu da Semana */}
            <section className="bg-netzach-card border border-netzach-border p-6 rounded-2xl relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Moon size={64}/></div>
                <h3 className="font-mystic text-xl text-white mb-4 flex items-center gap-2 relative z-10">
                    <Moon size={20} className="text-netzach-gold"/> Céu da Semana
                </h3>
                <p className="text-sm leading-relaxed text-netzach-text/90 whitespace-pre-wrap relative z-10">
                    {skyOfTheWeek || "Os astros estão em silêncio... Aguarde a atualização da Sacerdotisa."}
                </p>
            </section>

            {/* Previsão do Signo */}
            <section className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border p-6 rounded-2xl relative shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={64}/></div>
                <h3 className="font-mystic text-xl text-netzach-gold mb-4 flex items-center gap-2">
                    <Star size={20}/> Horóscopo: {userSign || 'Signo Desconhecido'}
                </h3>
                <p className="text-sm leading-relaxed text-netzach-text/90 whitespace-pre-wrap">
                    {weeklyPrediction || `Ainda não há previsões específicas para ${userSign} esta semana.`}
                </p>
                {!userSign && (
                    <p className="text-xs text-red-400 mt-4 italic">
                        Atualize sua data de nascimento no cadastro para ver seu signo.
                    </p>
                )}
            </section>

            {/* Dica Rápida */}
            <section className="bg-[#0F0518] border border-netzach-border p-4 rounded-xl text-center">
                <Sun size={24} className="mx-auto text-netzach-gold mb-2"/>
                <p className="text-xs text-netzach-muted uppercase tracking-widest">A energia muda, sua essência permanece.</p>
            </section>

        </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Moon, Sun, ArrowLeft, Star, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Sky() {
  const navigate = useNavigate();
  const [generalPrediction, setGeneralPrediction] = useState('');
  const [myPrediction, setMyPrediction] = useState('');
  const [userSign, setUserSign] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // 1. Busca Previsão Geral (Céu da Semana)
        // Tenta encontrar por 'geral' ou 'ceu_semana' para garantir
        const { data: geral } = await supabase
            .from('horoscopes')
            .select('content')
            .or('sign.eq.Geral,sign.eq.geral,sign.eq.ceu_semana') 
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if(geral) setGeneralPrediction(geral.content);

        // 2. Busca Signo do Usuário e Previsão Pessoal
        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('sign_sun')
                .eq('user_id', session.user.id)
                .single();

            if (profile?.sign_sun) {
                setUserSign(profile.sign_sun);
                
                const { data: personal } = await supabase
                    .from('horoscopes')
                    .select('content')
                    .eq('sign', profile.sign_sun.toLowerCase()) // 'aries', 'touro'...
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if(personal) setMyPrediction(personal.content);
            }
        }
    } catch (error) {
        console.error("Erro ao carregar o céu:", error);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic animate-pulse">Lendo as estrelas...</div>;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans p-6 pb-24">
      {/* Header com Voltar */}
      <button 
        onClick={() => navigate('/templo')} 
        className="mb-8 text-netzach-muted hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-colors"
      >
        <ArrowLeft size={16}/> Voltar ao Templo
      </button>
      
      <h1 className="text-3xl font-mystic text-netzach-gold mb-8 text-center flex justify-center items-center gap-3">
        <Sparkles size={24}/> Céu da Semana
      </h1>

      <div className="space-y-8 max-w-2xl mx-auto">
        
        {/* Card Geral */}
        <section className="bg-netzach-card p-8 rounded-2xl border border-netzach-border shadow-[0_0_30px_rgba(112,11,151,0.2)] relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-netzach-border opacity-30"><Moon size={120}/></div>
            
            <h2 className="text-xl font-mystic text-white mb-6 relative z-10 flex items-center gap-2">
                <Moon size={24} className="text-netzach-gold"/> Energia Coletiva
            </h2>
            
            <div className="text-netzach-text/90 leading-loose relative z-10 whitespace-pre-wrap font-light text-lg">
                {generalPrediction || "O céu está silencioso... A Sacerdotisa ainda não publicou as orientações gerais desta semana."}
            </div>
        </section>

        {/* Card Pessoal */}
        {userSign && (
            <section className="bg-gradient-to-br from-[#2a1245] to-netzach-bg p-8 rounded-2xl border border-netzach-gold/30 shadow-lg relative">
                <div className="absolute top-4 right-4 text-netzach-gold opacity-50"><Star size={24}/></div>
                
                <h2 className="text-xl font-mystic text-netzach-gold mb-6 flex items-center gap-2">
                    <Sun size={24}/> Para {userSign}
                </h2>
                
                <div className="text-white/90 leading-loose whitespace-pre-wrap font-light">
                    {myPrediction || `Ainda não há previsões específicas para ${userSign}. Concentre-se na energia coletiva acima.`}
                </div>
            </section>
        )}

        {!userSign && (
            <div className="text-center p-6 border border-dashed border-netzach-muted rounded-xl">
                <p className="text-netzach-muted mb-2">Você ainda não tem um signo solar cadastrado.</p>
                <p className="text-xs text-netzach-gold uppercase cursor-pointer hover:underline" onClick={() => navigate('/portal')}>
                    Atualizar meu cadastro
                </p>
            </div>
        )}

      </div>
    </div>
  );
}
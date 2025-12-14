import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calcularMatrizDestino } from '../utils/matrizCalculations';
import { MatrizMandala } from '../components/MatrizMandala';
import type { MatrizDestino as MatrizDestinoType } from '../types';
import { ARCANOS } from '../types';
import { ArrowLeft, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MatrizDestinoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [matriz, setMatriz] = useState<MatrizDestinoType | null>(null);

  useEffect(() => {
    loadProfileAndCalculate();
  }, []);

  const loadProfileAndCalculate = async () => {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Usuário não autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, birth_date, birth_time')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Perfil não encontrado');
      if (!profile.birth_date) throw new Error('Data de nascimento não cadastrada');

      setProfileData(profile);

      const matrizCalculada = calcularMatrizDestino(profile.birth_date);
      setMatriz(matrizCalculada);

      // Debug: verifique se os valores estão corretos
      console.log('Matriz calculada:', matrizCalculada);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Função helper para pegar nome do arcano com fallback
  const getArcanoName = (numero: number): string => {
    return ARCANOS[numero] || `Arcano ${numero}`;
  };

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic"><Loader2 className="animate-spin mr-2"/> Calculando...</div>;

  if (error) {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center p-4 font-sans">
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-mystic text-netzach-gold mb-4">Atenção</h2>
          <p className="text-netzach-text mb-6 text-sm">{error === 'Data de nascimento não cadastrada' ? 'Precisamos da sua data de nascimento para calcular a Matriz.' : error}</p>
          <button onClick={() => navigate('/portal')} className="bg-netzach-gold text-netzach-bg px-6 py-2 rounded-lg font-bold hover:bg-white transition-colors">Voltar</button>
        </div>
      </div>
    );
  }

  if (!matriz) return null;

  return (
    <div className="min-h-screen bg-netzach-bg py-8 px-4 font-sans text-netzach-text pb-32">
      <div className="max-w-5xl mx-auto">
        
        <button onClick={() => navigate('/templo')} className="mb-6 text-netzach-muted hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-colors"><ArrowLeft size={16}/> Voltar ao Templo</button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-mystic text-netzach-gold mb-2">Matriz da Alma</h1>
          <p className="text-lg text-white font-light">{profileData.full_name}</p>
          <p className="text-xs text-netzach-muted uppercase tracking-widest mt-1">
            {new Date(profileData.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-4 md:p-8 mb-8 overflow-x-auto shadow-2xl flex justify-center">
          <div className="min-w-[300px] md:min-w-[600px]"><MatrizMandala matriz={matriz} /></div>
        </div>

        {/* Informações Básicas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Essência */}
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-6">
            <h3 className="text-lg font-mystic text-netzach-gold mb-4 border-b border-netzach-border pb-2">Essência</h3>
            <p className="text-sm text-netzach-muted">
              Arcano Principal: <span className="text-white font-bold">{matriz.central.maior.arcano} - {getArcanoName(matriz.central.maior.arcano)}</span>
            </p>
          </div>

          {/* Destino Pessoal */}
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-6">
            <h3 className="text-lg font-mystic text-netzach-gold mb-4 border-b border-netzach-border pb-2">Destino Pessoal</h3>
            <p className="text-sm text-netzach-muted">
              Até os 40 anos: <span className="text-white font-bold">{matriz.propositos.pessoal.final} - {getArcanoName(matriz.propositos.pessoal.final)}</span>
            </p>
          </div>

          {/* Dinheiro */}
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-6">
            <h3 className="text-lg font-mystic text-netzach-gold mb-4 border-b border-netzach-border pb-2">Dinheiro</h3>
            <p className="text-sm text-netzach-muted">
              Entrada: <span className="text-white font-bold">{matriz.linhaPontilhada.primeiroDireita.arcano} - {getArcanoName(matriz.linhaPontilhada.primeiroDireita.arcano)}</span>
            </p>
          </div>

        </div>

        {/* BOTÃO DE VENDA */}
        <div className="text-center bg-gradient-to-r from-netzach-card to-[#2a1245] p-8 rounded-2xl border border-netzach-gold/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={100}/></div>
            
            <h2 className="text-2xl font-mystic text-white mb-4">Quer desvendar todos os segredos da sua Matriz?</h2>
            <p className="text-netzach-muted mb-8 max-w-xl mx-auto">
                A análise completa revela seus karmas de vidas passadas, sua missão espiritual, talentos ocultos e o caminho exato para a prosperidade.
            </p>
            
            <button 
                onClick={() => navigate('/servicos')}
                className="bg-netzach-gold text-netzach-bg px-8 py-4 rounded-xl font-mystic font-bold text-lg hover:bg-white transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)] animate-pulse flex items-center justify-center gap-2 mx-auto"
            >
                Solicitar Leitura Completa <ArrowRight size={20}/>
            </button>
        </div>

      </div>
    </div>
  );
}
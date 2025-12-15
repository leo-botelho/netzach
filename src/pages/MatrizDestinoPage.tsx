import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calcularMatrizDestino } from '../utils/calculationsMatriz';
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

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateSafe = (dateString: string) => {
    if(!dateString) return "";
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

  // Dados para a Tabela de Chakras
  const chakraRows = [
    { name: 'Sahasrara', desc: 'Missão', data: matriz.chakras.sahashara },
    { name: 'Ajna', desc: 'Destino', data: matriz.chakras.ajna },
    { name: 'Vishuddha', desc: 'Comunicação', data: matriz.chakras.vishuddha },
    { name: 'Anahata', desc: 'Relacionamentos', data: matriz.chakras.anahata },
    { name: 'Manipura', desc: 'Status', data: matriz.chakras.manipura },
    { name: 'Svadhishthana', desc: 'Amor', data: matriz.chakras.svadhishthana },
    { name: 'Muladhara', desc: 'Corpo', data: matriz.chakras.muladhara },
  ];

  return (
    <div className="min-h-screen bg-netzach-bg py-8 px-4 font-sans text-netzach-text pb-32">
      <div className="max-w-5xl mx-auto">
        
        <button onClick={() => navigate('/templo')} className="mb-6 text-netzach-muted hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-colors"><ArrowLeft size={16}/> Voltar ao Templo</button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-mystic text-netzach-gold mb-2">Matriz da Alma</h1>
          <p className="text-lg text-white font-light">{profileData.full_name}</p>
          <p className="text-xs text-netzach-muted uppercase tracking-widest mt-1">
            {formatDateSafe(profileData.birth_date)}
          </p>
        </div>

        {/* 1. MANDALA */}
        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-4 md:p-8 mb-12 overflow-x-auto shadow-2xl flex justify-center">
          <div className="min-w-[300px] md:min-w-[600px]"><MatrizMandala matriz={matriz} /></div>
        </div>

        {/* 2. INFORMAÇÕES PRINCIPAIS (Cards) */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Essência */}
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-6 hover:border-netzach-gold/30 transition-colors">
            <h3 className="text-lg font-mystic text-netzach-gold mb-4 border-b border-netzach-border pb-2">Essência</h3>
            <div className="space-y-4 text-sm">
              <div><span className="text-netzach-muted block text-xs uppercase mb-1">Central (Maior)</span><span className="font-bold text-white block">{matriz.central.maior.arcano} - {ARCANOS[matriz.central.maior.arcano]}</span></div>
              <div><span className="text-netzach-muted block text-xs uppercase mb-1">Médio</span><span className="text-white font-bold block">{matriz.central.medio.arcano} - {ARCANOS[matriz.central.medio.arcano]}</span></div>
              <div><span className="text-netzach-muted block text-xs uppercase mb-1">Menor</span><span className="text-white font-bold block">{matriz.central.menor.arcano} - {ARCANOS[matriz.central.menor.arcano]}</span></div>
            </div>
          </div>

          {/* Destino Pessoal */}
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-6 hover:border-netzach-gold/30 transition-colors">
            <h3 className="text-lg font-mystic text-netzach-gold mb-4 border-b border-netzach-border pb-2">Destino Pessoal</h3>
            <div className="space-y-4 text-sm">
              <div><span className="text-netzach-muted text-xs uppercase block mb-1">Até os 40 anos (Pessoal)</span><span className="text-white block font-bold">{matriz.propositos.pessoal.final} - {ARCANOS[matriz.propositos.pessoal.final]}</span></div>
              <div><span className="text-netzach-muted text-xs uppercase block mb-1">40-60 anos (Social)</span><span className="text-white block font-bold">{matriz.propositos.social.final} - {ARCANOS[matriz.propositos.social.final]}</span></div>
              <div><span className="text-netzach-muted text-xs uppercase block mb-1">Espiritual (+60)</span><span className="text-white block font-bold">{matriz.propositos.espiritual} - {ARCANOS[matriz.propositos.espiritual]}</span></div>
            </div>
          </div>

          {/* Dinheiro */}
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-6 hover:border-netzach-gold/30 transition-colors">
            <h3 className="text-lg font-mystic text-netzach-gold mb-4 border-b border-netzach-border pb-2">Dinheiro & Carreira</h3>
            <div className="space-y-4 text-sm">
              <div><span className="text-netzach-muted text-xs uppercase block mb-1">Entrada de Dinheiro</span><span className="text-white font-bold block">{matriz.linhaPontilhada.primeiroDireita.arcano} - {ARCANOS[matriz.linhaPontilhada.primeiroDireita.arcano]}</span></div>
              <div><span className="text-netzach-muted text-xs uppercase block mb-1">Bloqueio Cármico</span><span className="text-white block font-bold">{matriz.lateralDireita.maior.arcano} - {ARCANOS[matriz.lateralDireita.maior.arcano]}</span></div>
              <div><span className="text-netzach-muted text-xs uppercase block mb-1">Ponto de Equilíbrio</span><span className="text-white block font-bold">{matriz.linhaPontilhada.meio.arcano} - {ARCANOS[matriz.linhaPontilhada.meio.arcano]}</span></div>
            </div>
          </div>
        </div>

        {/* 3. MAPA DA SAÚDE (CHAKRAS) - NOVO */}
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-6 mb-12 overflow-hidden">
            <h3 className="text-xl font-mystic text-netzach-gold mb-6 text-center">Mapa da Saúde</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-netzach-muted uppercase bg-[#0F0518] border-b border-netzach-border">
                        <tr>
                            <th className="px-6 py-3">Chakra</th>
                            <th className="px-6 py-3 text-center">Física</th>
                            <th className="px-6 py-3 text-center">Energia</th>
                            <th className="px-6 py-3 text-center">Emoções</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-netzach-border">
                        {chakraRows.map((row, index) => (
                            <tr key={index} className="hover:bg-[#0F0518]/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-white">
                                    {row.name} <span className="block text-xs font-normal text-netzach-muted">{row.desc}</span>
                                </td>
                                <td className="px-6 py-4 text-center text-netzach-gold font-bold">{row.data.fisico}</td>
                                <td className="px-6 py-4 text-center text-netzach-gold font-bold">{row.data.energia}</td>
                                <td className="px-6 py-4 text-center text-netzach-gold font-bold">{row.data.emocoes}</td>
                            </tr>
                        ))}
                        {/* Resumo */}
                        <tr className="bg-[#0F0518] font-bold">
                            <td className="px-6 py-4 text-netzach-gold">RESUMO GERAL</td>
                            <td className="px-6 py-4 text-center text-white">{matriz.resumoSaude.fisico}</td>
                            <td className="px-6 py-4 text-center text-white">{matriz.resumoSaude.energetico}</td>
                            <td className="px-6 py-4 text-center text-white">{matriz.resumoSaude.emocional}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* 4. PROGRAMAS DE LINHAGEM - NOVO */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
            
            {/* Masculina */}
            <div className="bg-netzach-card border border-netzach-border rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl">♂</div>
                <h3 className="text-lg font-mystic text-netzach-gold mb-6 flex items-center gap-2">♂ Linhagem Masculina</h3>
                <div className="flex justify-center items-center gap-6">
                    <div className="text-center">
                        <div className="w-14 h-14 rounded-full border-2 border-netzach-gold flex items-center justify-center text-xl font-bold text-white mb-2 mx-auto">
                            {matriz.diagonalSuperiorEsquerda.maior.arcano}
                        </div>
                        <span className="text-xs text-netzach-muted uppercase">Maior</span>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full border border-netzach-muted flex items-center justify-center text-lg font-bold text-white mb-2 mx-auto">
                            {matriz.diagonalSuperiorEsquerda.meio.arcano}
                        </div>
                        <span className="text-xs text-netzach-muted uppercase">Meio</span>
                    </div>
                    <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-[#0F0518] flex items-center justify-center text-md font-bold text-netzach-gold mb-2 mx-auto">
                            {matriz.diagonalSuperiorEsquerda.menor.arcano}
                        </div>
                        <span className="text-xs text-netzach-muted uppercase">Menor</span>
                    </div>
                </div>
            </div>

            {/* Feminina */}
            <div className="bg-netzach-card border border-netzach-border rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl">♀</div>
                <h3 className="text-lg font-mystic text-netzach-gold mb-6 flex items-center gap-2">♀ Linhagem Feminina</h3>
                <div className="flex justify-center items-center gap-6">
                    <div className="text-center">
                        <div className="w-14 h-14 rounded-full border-2 border-netzach-gold flex items-center justify-center text-xl font-bold text-white mb-2 mx-auto">
                            {matriz.diagonalSuperiorDireita.maior.arcano}
                        </div>
                        <span className="text-xs text-netzach-muted uppercase">Maior</span>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full border border-netzach-muted flex items-center justify-center text-lg font-bold text-white mb-2 mx-auto">
                            {matriz.diagonalSuperiorDireita.meio.arcano}
                        </div>
                        <span className="text-xs text-netzach-muted uppercase">Meio</span>
                    </div>
                    <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-[#0F0518] flex items-center justify-center text-md font-bold text-netzach-gold mb-2 mx-auto">
                            {matriz.diagonalSuperiorDireita.menor.arcano}
                        </div>
                        <span className="text-xs text-netzach-muted uppercase">Menor</span>
                    </div>
                </div>
            </div>
        </div>

        {/* 5. CTA - Venda */}
        <div className="text-center bg-gradient-to-r from-netzach-card to-[#2a1245] p-8 rounded-2xl border border-netzach-gold/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={100}/></div>
            <h2 className="text-2xl font-mystic text-white mb-4">Quer desvendar todos os segredos da sua Alma?</h2>
            <p className="text-netzach-muted mb-8 max-w-xl mx-auto leading-relaxed">
                Esta é apenas a superfície. A análise completa revela seus karmas de vidas passadas, sua missão espiritual detalhada, talentos ocultos e o caminho exato para a prosperidade.
            </p>
            <button onClick={() => navigate('/servicos')} className="bg-netzach-gold text-netzach-bg px-8 py-4 rounded-xl font-mystic font-bold text-lg hover:bg-white transition-all shadow-lg animate-pulse flex items-center justify-center gap-2 mx-auto">
                Solicitar Leitura Completa <ArrowRight size={20}/>
            </button>
        </div>

      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Feather, Moon, Sparkles } from 'lucide-react';

interface Ritual {
  id: string;
  title: string;
  description: string;
  materials: string; // ou ingredients, dependendo de como criou no banco
  category: string;
  moon_phase?: string;
}

export default function Rituals() {
  const navigate = useNavigate();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRituals();
  }, []);

  const fetchRituals = async () => {
    try {
      const { data, error } = await supabase
        .from('rituals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRituals(data);
    } catch (error) {
      console.error("Erro ao carregar rituais:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic">Abrindo o Grimório...</div>;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans p-6 pb-24">
      
      {/* Header */}
      <button 
        onClick={() => navigate('/templo')} 
        className="mb-8 text-netzach-muted hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-colors"
      >
        <ArrowLeft size={16}/> Voltar ao Templo
      </button>
      
      <h1 className="text-3xl font-mystic text-netzach-gold mb-2 text-center flex justify-center items-center gap-3">
        <Feather size={28}/> Grimório de Rituais
      </h1>
      <p className="text-center text-netzach-muted text-xs uppercase tracking-widest mb-10">Sabedoria Ancestral</p>

      {/* Lista de Rituais */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        
        {rituals.length === 0 && (
            <div className="col-span-full text-center p-10 border border-dashed border-netzach-border rounded-xl text-netzach-muted">
                O grimório ainda está sendo escrito pela Sacerdotisa.
            </div>
        )}

        {rituals.map(ritual => (
            <div key={ritual.id} className="bg-netzach-card p-6 rounded-xl border border-netzach-border hover:border-netzach-gold/50 transition-all group relative overflow-hidden shadow-lg">
                
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <h3 className="text-xl font-mystic text-white group-hover:text-netzach-gold transition-colors">{ritual.title}</h3>
                    {ritual.moon_phase && ritual.moon_phase !== 'Qualquer' && (
                        <span className="text-[10px] uppercase tracking-wider bg-[#0F0518] border border-netzach-border px-2 py-1 rounded flex items-center gap-1 text-netzach-muted">
                            <Moon size={10}/> {ritual.moon_phase}
                        </span>
                    )}
                </div>
                
                {/* Descrição */}
                <p className="text-sm text-netzach-text/80 mb-6 leading-relaxed relative z-10">
                    {ritual.description}
                </p>
                
                {/* Materiais */}
                {ritual.materials && (
                    <div className="bg-[#0F0518]/50 p-4 rounded-lg border border-netzach-border/50 text-sm relative z-10">
                        <strong className="text-netzach-gold block mb-2 text-xs uppercase flex items-center gap-1">
                            <Sparkles size={12}/> Ingredientes Necessários:
                        </strong>
                        <p className="text-netzach-muted font-light whitespace-pre-wrap">{ritual.materials}</p>
                    </div>
                )}

                {/* Efeito de Fundo */}
                <div className="absolute top-0 right-0 p-10 bg-netzach-accent/5 blur-[60px] rounded-full pointer-events-none"></div>
            </div>
        ))}
      </div>
    </div>
  );
}
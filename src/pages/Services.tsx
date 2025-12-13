import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import type { ServiceCatalog } from '../types';

export default function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase.from('services_catalog').select('*').eq('active', true).order('created_at');
      if (data) setServices(data);
      setLoading(false);
    };
    fetchServices();
  }, []);

  const handleAcquire = async (service: ServiceCatalog) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');

    if (service.payment_url) {
        const finalUrl = service.payment_url.includes('?') 
            ? `${service.payment_url}&client_id=${session.user.id}` 
            : `${service.payment_url}?client_id=${session.user.id}`;
            
        window.open(finalUrl, '_blank');
    } else {
        alert(`Para adquirir ${service.title}, entre em contato com o suporte ou aguarde a liberação.`);
    }
  };

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic">Carregando catálogo...</div>;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans p-6 pb-24 flex flex-col items-center">
      
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center">
        <button onClick={() => navigate('/templo')} className="text-netzach-muted hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-colors">
            <ArrowLeft size={16}/> Voltar
        </button>
      </div>
      
      <div className="text-center mb-10">
        <h1 className="text-3xl font-mystic text-netzach-gold mb-2 flex items-center justify-center gap-2">
            <Sparkles size={28}/> Serviços Sagrados
        </h1>
        <p className="text-netzach-muted text-sm uppercase tracking-widest">
            Ferramentas para sua evolução
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {services.length === 0 && (
            <div className="col-span-full text-center p-10 border border-dashed border-netzach-border rounded-xl text-netzach-muted">
                Nenhum serviço disponível no momento.
            </div>
        )}

        {services.map(service => (
            <div key={service.id} className="bg-netzach-card border border-netzach-border rounded-xl p-6 flex flex-col justify-between hover:border-netzach-gold/50 transition-all shadow-lg group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag size={80}/></div>
                
                <div>
                    <h3 className="text-xl font-mystic text-white mb-2">{service.title}</h3>
                    <p className="text-sm text-netzach-muted mb-6 leading-relaxed min-h-[60px]">{service.description}</p>
                </div>

                <div className="flex items-center justify-between border-t border-netzach-border pt-4">
                    <span className="text-lg font-bold text-netzach-gold">R$ {service.price.toFixed(2)}</span>
                    <button 
                        onClick={() => handleAcquire(service)}
                        className="bg-netzach-accent text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-600 transition-colors shadow-lg"
                    >
                        Adquirir <ArrowRight size={16}/>
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
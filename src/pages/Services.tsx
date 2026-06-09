import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, ArrowRight, ShoppingBag, X, ChevronDown } from 'lucide-react';
import type { ServiceCatalog } from '../types';

const MAX_DESC_LENGTH = 120;

export default function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalService, setModalService] = useState<ServiceCatalog | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('services_catalog')
        .select('*')
        .eq('active', true)
        .order('created_at');
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

  if (loading)
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic">
        Carregando catálogo...
      </div>
    );

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans p-6 pb-24 flex flex-col items-center">

      <div className="w-full max-w-4xl mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/templo')}
          className="text-netzach-muted hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-mystic text-netzach-gold mb-2 flex items-center justify-center gap-2">
          <Sparkles size={28} /> Serviços Sagrados
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

        {services.map((service) => {
          const isLong = (service.description?.length ?? 0) > MAX_DESC_LENGTH;
          const preview = isLong
            ? service.description.slice(0, MAX_DESC_LENGTH).trimEnd() + '…'
            : service.description;

          return (
            <div
              key={service.id}
              className="bg-netzach-card border border-netzach-border rounded-xl p-6 flex flex-col justify-between hover:border-netzach-gold/50 transition-all shadow-lg group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShoppingBag size={80} />
              </div>

              <div>
                <h3 className="text-xl font-mystic text-white mb-3">{service.title}</h3>

                <p className="text-sm text-netzach-muted leading-relaxed mb-1">
                  {preview}
                </p>

                {isLong && (
                  <button
                    onClick={() => setModalService(service)}
                    className="flex items-center gap-1 text-xs text-netzach-gold hover:text-white transition-colors mt-1 mb-4"
                  >
                    <ChevronDown size={13} /> Ver descrição completa
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-netzach-border pt-4 mt-4">
                <span className="text-lg font-bold text-netzach-gold">
                  R$ {service.price.toFixed(2)}
                </span>
                <button
                  onClick={() => handleAcquire(service)}
                  className="bg-netzach-accent text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-600 transition-colors shadow-lg"
                >
                  Adquirir <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal de descrição ── */}
      {modalService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModalService(null)}
        >
          <div
            className="bg-netzach-card border border-netzach-border rounded-2xl shadow-2xl w-full max-w-lg p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fechar */}
            <button
              onClick={() => setModalService(null)}
              className="absolute top-4 right-4 text-netzach-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Ícone decorativo */}
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <ShoppingBag size={90} />
            </div>

            <h2 className="text-2xl font-mystic text-netzach-gold mb-4">{modalService.title}</h2>

            <p className="text-sm text-netzach-text leading-relaxed mb-6 whitespace-pre-line">
              {modalService.description}
            </p>

            <div className="flex items-center justify-between border-t border-netzach-border pt-4">
              <span className="text-xl font-bold text-netzach-gold">
                R$ {modalService.price.toFixed(2)}
              </span>
              <button
                onClick={() => {
                  setModalService(null);
                  handleAcquire(modalService);
                }}
                className="bg-netzach-accent text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-purple-600 transition-colors shadow-lg"
              >
                Adquirir <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

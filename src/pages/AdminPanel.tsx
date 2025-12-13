import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  Feather, 
  CheckCircle, 
  Sun, 
  Sparkles, 
  LayoutGrid, 
  Trash2, 
  Link as LinkIcon 
} from 'lucide-react';

const SIGNOS = ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('energia');
  const [loading, setLoading] = useState(false);

  // Estados dos Formulários
  
  // 1. Energia do Dia (Arcano)
  const [insightForm, setInsightForm] = useState({ 
    tarot_card_id: '', 
    recommended_bath: '', 
    moon_phase: 'Crescente',
    card_image_url: '', 
    card_meaning: ''    
  });

  // 2. Horóscopo
  const [selectedSign, setSelectedSign] = useState('Geral');
  const [predictionText, setPredictionText] = useState('');

  // 3. Rituais
  const [ritualData, setRitualData] = useState({ 
    title: '', 
    description: '', 
    materials: '', 
    moon_phase: 'Qualquer' 
  });
  
  // 4. Catálogo de Serviços (Venda)
  const [newService, setNewService] = useState({ 
    title: '', 
    description: '', 
    price: '', 
    payment_url: '' 
  });
  const [catalog, setCatalog] = useState<any[]>([]);
  
  // 5. Pedidos de Serviço
  const [requests, setRequests] = useState<any[]>([]);

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    checkAdmin();
    fetchRequests();
    fetchCatalog();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');
    const { data } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single();
    if (data?.role !== 'admin') {
      alert("Acesso restrito à Sacerdotisa.");
      navigate('/templo');
    }
  };

  // --- FUNÇÕES DE SALVAMENTO ---

  // 1. SALVAR ENERGIA (Arcano/Lua)
  const handleSaveInsight = async () => {
    setLoading(true);
    const { error } = await supabase.from('daily_insights').insert({
        date: new Date().toISOString(),
        tarot_card_id: insightForm.tarot_card_id,
        recommended_bath: insightForm.recommended_bath,
        moon_phase: insightForm.moon_phase,
        card_image_url: insightForm.card_image_url,
        card_meaning: insightForm.card_meaning
    });
    setLoading(false);
    if (!error) alert("Energia da semana atualizada!");
    else alert("Erro: " + error.message);
  };

  // 2. SALVAR PREVISÃO (Horóscopo)
  const handleSavePrediction = async () => {
    if (!predictionText) return alert("Escreva uma previsão.");
    setLoading(true);
    
    const type = selectedSign === 'Geral' ? 'sky_weekly' : 'sign_weekly';
    const signKey = selectedSign === 'Geral' ? 'ceu_semana' : selectedSign.toLowerCase();
    
    await supabase.from('horoscopes').delete().match({ sign: signKey, type: type });
    
    const { error } = await supabase.from('horoscopes').insert({
      sign: signKey,
      type: type,
      content: predictionText,
      valid_date: new Date().toISOString()
    });

    setLoading(false);
    if (!error) { 
        alert(`Previsão para ${selectedSign} publicada!`); 
        setPredictionText(''); 
    } else {
        alert("Erro: " + error.message);
    }
  };

  // 3. SALVAR RITUAL
  const handleSaveRitual = async () => {
    if (!ritualData.title) return alert("Preencha o título.");
    setLoading(true);
    const { error } = await supabase.from('rituals').insert({ ...ritualData, category: 'ritual' });
    setLoading(false);
    if (!error) { 
        alert("Ritual criado!"); 
        setRitualData({ title: '', description: '', materials: '', moon_phase: 'Qualquer' }); 
    } else {
        alert("Erro: " + error.message);
    }
  };

  // 4. GERENCIAR CATÁLOGO
  const fetchCatalog = async () => {
    const { data } = await supabase.from('services_catalog').select('*').order('created_at');
    if (data) setCatalog(data);
  };

  const handleCreateService = async () => {
    if (!newService.title || !newService.price) return alert("Preencha título e preço.");
    
    await supabase.from('services_catalog').insert({ 
        ...newService, 
        price: parseFloat(newService.price),
        payment_url: newService.payment_url || null
    });
    
    setNewService({ title: '', description: '', price: '', payment_url: '' });
    fetchCatalog();
    alert("Serviço adicionado à venda!");
  };

  const handleDeleteService = async (id: string) => {
    if(confirm("Remover este serviço da venda?")) {
        await supabase.from('services_catalog').delete().eq('id', id);
        fetchCatalog();
    }
  };

  // 5. GERENCIAR PEDIDOS
  const fetchRequests = async () => {
    const { data } = await supabase.from('service_requests').select('*, profiles(full_name, whatsapp)').order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  const handleCompleteRequest = async (id: string) => {
    if(!confirm("Marcar como concluído?")) return;
    await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id);
    fetchRequests();
  };

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans p-6">
      
      {/* Header */}
      <header className="mb-8 border-b border-netzach-border pb-4 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-mystic text-netzach-gold">Painel da Sacerdotisa</h1>
            <p className="text-netzach-muted text-sm">Gestão do Templo Digital</p>
        </div>
        <button onClick={() => navigate('/templo')} className="text-xs border border-netzach-border px-3 py-2 rounded hover:bg-netzach-card transition-colors">
            Voltar ao Templo
        </button>
      </header>

      {/* Navegação de Abas */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {[
            { id: 'energia', icon: Sparkles, label: 'Energia' },
            { id: 'previsoes', icon: Sun, label: 'Horóscopo' },
            { id: 'catalogo', icon: LayoutGrid, label: 'Catálogo' },
            { id: 'servicos', icon: Feather, label: 'Pedidos Pendentes' },
            { id: 'rituais', icon: Star, label: 'Rituais' },
        ].map(tab => (
            <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap border ${activeTab === tab.id ? 'bg-netzach-gold text-netzach-bg border-netzach-gold' : 'bg-netzach-card border-netzach-border text-netzach-muted hover:border-netzach-gold'}`}
            >
                <tab.icon size={18}/> {tab.label}
            </button>
        ))}
      </div>

      {/* --- ABA 1: ENERGIA (ARCANO + BANHO) --- */}
      {activeTab === 'energia' && (
        <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-5">
            <h2 className="text-xl font-mystic text-white mb-2 flex items-center gap-2"><Sparkles size={20}/> Definir Arcano da Semana</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-netzach-gold uppercase font-bold block mb-1">Nome do Arcano</label>
                    <input placeholder="Ex: A Imperatriz" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" 
                        value={insightForm.tarot_card_id} onChange={e => setInsightForm({...insightForm, tarot_card_id: e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs text-netzach-gold uppercase font-bold block mb-1">Fase da Lua Atual</label>
                    <input placeholder="Ex: Cheia em Leão" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" 
                        value={insightForm.moon_phase} onChange={e => setInsightForm({...insightForm, moon_phase: e.target.value})}/>
                </div>
            </div>

            <div>
                <label className="text-xs text-netzach-gold uppercase font-bold block mb-1">URL da Imagem da Carta</label>
                <input placeholder="https://..." className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold text-sm" 
                    value={insightForm.card_image_url} onChange={e => setInsightForm({...insightForm, card_image_url: e.target.value})}/>
                <p className="text-[10px] text-netzach-muted mt-1">Cole o link direto da imagem (ex: de um banco de imagens ou bucket).</p>
            </div>

            <div>
                <label className="text-xs text-netzach-gold uppercase font-bold block mb-1">Interpretação (Texto do Modal)</label>
                <textarea rows={6} placeholder="O que esta carta significa para a semana das alunas?" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" 
                    value={insightForm.card_meaning} onChange={e => setInsightForm({...insightForm, card_meaning: e.target.value})}/>
            </div>

            <div>
                <label className="text-xs text-netzach-gold uppercase font-bold block mb-1">Banho Recomendado</label>
                <input placeholder="Ex: Banho de Alecrim para clareza" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" 
                    value={insightForm.recommended_bath} onChange={e => setInsightForm({...insightForm, recommended_bath: e.target.value})}/>
            </div>

            <button onClick={handleSaveInsight} disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold hover:bg-white transition-all shadow-lg mt-4">
                {loading ? 'Salvando...' : 'Atualizar Templo'}
            </button>
        </div>
      )}

      {/* --- ABA 2: PREVISÕES --- */}
      {activeTab === 'previsoes' && (
        <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-4">
            <h2 className="text-xl font-mystic text-white">Horóscopo</h2>
            <select className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" value={selectedSign} onChange={(e) => setSelectedSign(e.target.value)}>
                <option value="Geral">🌌 Céu da Semana (Geral)</option>
                {SIGNOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea rows={6} className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" placeholder={`Escreva a previsão para ${selectedSign}...`} value={predictionText} onChange={(e) => setPredictionText(e.target.value)}/>
            <button onClick={handleSavePrediction} disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold hover:bg-white transition-all">
                {loading ? 'Salvando...' : 'Publicar'}
            </button>
        </div>
      )}

      {/* --- ABA 3: CATÁLOGO DE SERVIÇOS --- */}
      {activeTab === 'catalogo' && (
        <div className="space-y-8 max-w-4xl">
            <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border space-y-4">
                <h3 className="text-lg font-mystic text-white">Cadastrar Serviço para Venda</h3>
                <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Título (Ex: Mapa Astral)" className="p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" onChange={e => setNewService({...newService, title: e.target.value})} value={newService.title}/>
                    <input type="number" placeholder="Preço (R$)" className="p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" onChange={e => setNewService({...newService, price: e.target.value})} value={newService.price}/>
                </div>
                
                <div className="relative">
                    <LinkIcon className="absolute left-3 top-3.5 text-netzach-muted" size={16}/>
                    <input placeholder="Link de Pagamento / Webhook (Opcional)" className="w-full pl-10 p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white placeholder-netzach-muted/50 outline-none focus:border-netzach-gold" onChange={e => setNewService({...newService, payment_url: e.target.value})} value={newService.payment_url}/>
                </div>

                <textarea rows={2} placeholder="Descrição curta..." className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" onChange={e => setNewService({...newService, description: e.target.value})} value={newService.description}/>
                <button onClick={handleCreateService} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold hover:bg-white transition-all">Adicionar ao Catálogo</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {catalog.map(item => (
                    <div key={item.id} className="p-4 border border-netzach-border rounded-xl flex justify-between items-start bg-[#0F0518]">
                        <div>
                            <h4 className="font-bold text-netzach-gold">{item.title}</h4>
                            <p className="text-xs text-netzach-muted">R$ {item.price}</p>
                            {item.payment_url && <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1"><LinkIcon size={10}/> Link Ativo</p>}
                        </div>
                        <button onClick={() => handleDeleteService(item.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18}/></button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- ABA 4: PEDIDOS DE SERVIÇO --- */}
      {activeTab === 'servicos' && (
        <div className="grid gap-4 max-w-4xl">
            {requests.length === 0 && <p className="text-netzach-muted italic">Nenhum pedido pendente.</p>}
            {requests.map(req => (
                <div key={req.id} className="bg-netzach-card p-5 rounded-xl border border-netzach-border flex justify-between items-start hover:border-netzach-gold/50 transition-colors">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${req.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>{req.status}</span>
                            <span className="text-netzach-gold font-mystic">{req.service_type}</span>
                        </div>
                        <h4 className="text-white font-bold">{req.profiles?.full_name}</h4>
                        <p className="text-sm text-netzach-muted">Whats: {req.profiles?.whatsapp || 'N/A'}</p>
                        <div className="mt-3 p-3 bg-[#0F0518] rounded text-sm text-white/80 border border-netzach-border/50 italic">"{req.user_notes}"</div>
                    </div>
                    {req.status !== 'completed' && (
                        <button onClick={() => handleCompleteRequest(req.id)} className="bg-netzach-border hover:bg-green-700 text-white p-3 rounded-lg transition-colors ml-4"><CheckCircle size={24}/></button>
                    )}
                </div>
            ))}
        </div>
      )}

      {/* --- ABA 5: RITUAIS --- */}
      {activeTab === 'rituais' && (
        <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-4">
            <h2 className="text-xl font-mystic text-white">Novo Ritual</h2>
            <input placeholder="Título" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" onChange={e => setRitualData({...ritualData, title: e.target.value})} value={ritualData.title}/>
            <textarea rows={3} placeholder="Ingredientes..." className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" onChange={e => setRitualData({...ritualData, materials: e.target.value})} value={ritualData.materials}/>
            <textarea rows={4} placeholder="Como fazer..." className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" onChange={e => setRitualData({...ritualData, description: e.target.value})} value={ritualData.description}/>
            <div className="flex gap-4">
                <select className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white outline-none focus:border-netzach-gold" value={ritualData.moon_phase} onChange={e => setRitualData({...ritualData, moon_phase: e.target.value})}>
                    <option value="Qualquer">Fase da Lua (Opcional)</option>
                    <option value="Nova">Nova</option>
                    <option value="Crescente">Crescente</option>
                    <option value="Cheia">Cheia</option>
                    <option value="Minguante">Minguante</option>
                </select>
                <button onClick={handleSaveRitual} disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold hover:bg-white transition-all">
                    {loading ? 'Criando...' : 'Adicionar ao Grimório'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
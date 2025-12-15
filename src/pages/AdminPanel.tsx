import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Star, Moon, Feather, CheckCircle, Sun, Sparkles, LayoutGrid, Trash2, 
  Link as LinkIcon, Users, Search, Power, Ban
} from 'lucide-react';

const SIGNOS = ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('energia');
  const [loading, setLoading] = useState(false);

  // Formulários
  const [insightForm, setInsightForm] = useState({ 
    tarot_card_id: '', 
    recommended_bath: '', 
    moon_phase: 'Crescente', 
    card_image_url: '', 
    card_meaning: ''    
  });

  const [selectedSign, setSelectedSign] = useState('Geral');
  const [predictionText, setPredictionText] = useState('');
  
  const [ritualData, setRitualData] = useState({ title: '', description: '', materials: '', moon_phase: 'Qualquer' });
  const [newService, setNewService] = useState({ title: '', description: '', price: '', payment_url: '' });
  
  // Listas
  const [catalog, setCatalog] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAdmin();
    fetchRequests();
    fetchCatalog();
    fetchUsers();
    loadTodayInsight(); // Carrega dados existentes para edição
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');
    const { data } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single();
    if (data?.role !== 'admin') {
      alert("Acesso restrito.");
      navigate('/templo');
    }
  };

  // Carrega o Arcano/Energia já salvo hoje (para editar)
  const loadTodayInsight = async () => {
    // Busca o último registro criado
    const { data } = await supabase.from('daily_insights').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (data) {
        setInsightForm({
            tarot_card_id: data.tarot_card_id || '',
            recommended_bath: data.recommended_bath || '',
            moon_phase: data.moon_phase || 'Crescente',
            card_image_url: data.card_image_url || '',
            card_meaning: data.card_meaning || ''
        });
    }
  };

  // --- SALVAR/EDITAR ENERGIA ---
  const handleSaveInsight = async () => {
    setLoading(true);
    // Remove o de hoje (se houver) para substituir pelo novo (Simulando Edição)
    // Nota: Em um sistema ideal usaríamos UPDATE com ID, mas isso simplifica a lógica diária
    
    // 1. Tenta atualizar o último registro SE ele for de hoje (opcional, ou apenas cria um novo no topo)
    // Vamos apenas inserir um novo que ficará no topo da lista (o Templo pega sempre o último)
    const { error } = await supabase.from('daily_insights').insert({
        date: new Date().toISOString(),
        tarot_card_id: insightForm.tarot_card_id,
        recommended_bath: insightForm.recommended_bath,
        moon_phase: insightForm.moon_phase,
        card_image_url: insightForm.card_image_url,
        card_meaning: insightForm.card_meaning
    });
    
    setLoading(false);
    if (!error) alert("Energia da semana salva/atualizada!");
    else alert("Erro ao salvar: " + error.message);
  };

  // --- RITUAIS (Corrigido) ---
  const handleSaveRitual = async () => {
    if (!ritualData.title) return alert("O título é obrigatório.");
    setLoading(true);
    
    const { error } = await supabase.from('rituals').insert({ 
        title: ritualData.title,
        description: ritualData.description,
        materials: ritualData.materials,
        moon_phase: ritualData.moon_phase,
        category: 'ritual',
        is_active: true
    });

    setLoading(false);
    if (!error) { 
        alert("Ritual adicionado ao Grimório com sucesso!"); 
        setRitualData({ title: '', description: '', materials: '', moon_phase: 'Qualquer' }); 
    } else {
        alert("Erro ao salvar ritual: " + error.message);
    }
  };

  // --- OUTRAS FUNÇÕES ---
  const fetchUsers = async () => { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if(data) setUsers(data); };
  const toggleUserStatus = async (id: string, current: string) => { if(!confirm("Alterar status?")) return; const novo = current === 'active' ? 'inactive' : 'active'; await supabase.from('profiles').update({ subscription_status: novo }).eq('id', id); fetchUsers(); };
  
  const handleSavePrediction = async () => { setLoading(true); const type = selectedSign === 'Geral' ? 'sky_weekly' : 'sign_weekly'; const signKey = selectedSign === 'Geral' ? 'ceu_semana' : selectedSign.toLowerCase(); await supabase.from('horoscopes').delete().match({ sign: signKey, type }); await supabase.from('horoscopes').insert({ sign: signKey, type, content: predictionText, valid_date: new Date().toISOString() }); setLoading(false); alert("Publicado!"); };
  
  const handleCreateService = async () => { await supabase.from('services_catalog').insert({ ...newService, price: parseFloat(newService.price), payment_url: newService.payment_url || null }); setNewService({ title: '', description: '', price: '', payment_url: '' }); fetchCatalog(); alert("Criado!"); };
  const fetchCatalog = async () => { const { data } = await supabase.from('services_catalog').select('*').order('created_at'); if(data) setCatalog(data); };
  const handleDeleteService = async (id: string) => { if(confirm("Excluir?")) { await supabase.from('services_catalog').delete().eq('id', id); fetchCatalog(); } };
  
  const fetchRequests = async () => { const { data } = await supabase.from('service_requests').select('*, profiles(full_name, whatsapp)').order('created_at', { ascending: false }); if(data) setRequests(data); };
  const handleCompleteRequest = async (id: string) => { await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id); fetchRequests(); };

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans p-6">
      <header className="mb-8 border-b border-netzach-border pb-4 flex justify-between items-center">
        <div><h1 className="text-3xl font-mystic text-netzach-gold">Painel da Sacerdotisa</h1></div>
        <button onClick={() => navigate('/templo')} className="text-xs border border-netzach-border px-3 py-2 rounded hover:bg-netzach-card">Voltar ao Templo</button>
      </header>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {[
            { id: 'energia', icon: Sparkles, label: '1. Arcano' },
            { id: 'previsoes', icon: Sun, label: '2. Horóscopo' },
            { id: 'catalogo', icon: LayoutGrid, label: '3. Catálogo' },
            { id: 'rituais', icon: Star, label: '4. Rituais' },
            { id: 'servicos', icon: Feather, label: `5. Pedidos (${requests.filter(r => r.status === 'pending').length})` },
            { id: 'iniciadas', icon: Users, label: '6. Alunas' }
        ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-lg border whitespace-nowrap ${activeTab === tab.id ? 'bg-netzach-gold text-netzach-bg border-netzach-gold font-bold' : 'bg-netzach-card border-netzach-border text-netzach-muted'}`}>
                <tab.icon size={18}/> {tab.label}
            </button>
        ))}
      </div>

      {/* 1. ENERGIA (ARCANO) - Agora carrega dados para edição */}
      {activeTab === 'energia' && (
        <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-4">
            <h2 className="text-xl font-mystic text-white mb-2">Arcano da Semana</h2>
            <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nome do Arcano" className="p-3 bg-[#0F0518] border border-netzach-border rounded text-white" value={insightForm.tarot_card_id} onChange={e => setInsightForm({...insightForm, tarot_card_id: e.target.value})}/>
                <input placeholder="Fase da Lua" className="p-3 bg-[#0F0518] border border-netzach-border rounded text-white" value={insightForm.moon_phase} onChange={e => setInsightForm({...insightForm, moon_phase: e.target.value})}/>
            </div>
            <input placeholder="URL da Imagem da Carta" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white text-xs" value={insightForm.card_image_url} onChange={e => setInsightForm({...insightForm, card_image_url: e.target.value})}/>
            <textarea rows={4} placeholder="Interpretação completa..." className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white" value={insightForm.card_meaning} onChange={e => setInsightForm({...insightForm, card_meaning: e.target.value})}/>
            <input placeholder="Banho Recomendado (Texto curto)" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white" value={insightForm.recommended_bath} onChange={e => setInsightForm({...insightForm, recommended_bath: e.target.value})}/>
            <button onClick={handleSaveInsight} disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded font-bold hover:bg-white">{loading ? 'Salvando...' : 'Salvar / Atualizar'}</button>
        </div>
      )}
      
      {/* 2. PREVISÕES */}
      {activeTab === 'previsoes' && (
        <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-4">
            <h2 className="text-xl font-mystic text-white">Horóscopo</h2>
            <select className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white" value={selectedSign} onChange={e => setSelectedSign(e.target.value)}><option value="Geral">🌌 Céu da Semana (Geral)</option>{SIGNOS.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <textarea rows={6} className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white" value={predictionText} onChange={e => setPredictionText(e.target.value)} placeholder="Escreva a previsão aqui..."/>
            <button onClick={handleSavePrediction} disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded font-bold hover:bg-white">{loading ? 'Publicando...' : 'Publicar'}</button>
        </div>
      )}

      {/* 3. CATÁLOGO */}
      {activeTab === 'catalogo' && (
        <div className="space-y-6">
            <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border space-y-4 max-w-2xl">
                <input placeholder="Título do Serviço" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" onChange={e => setNewService({...newService, title: e.target.value})} value={newService.title}/>
                <input placeholder="Preço (R$)" type="number" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" onChange={e => setNewService({...newService, price: e.target.value})} value={newService.price}/>
                <div className="relative"><LinkIcon className="absolute left-3 top-3.5 text-netzach-muted" size={16}/><input placeholder="Link Pagamento (Opcional)" className="w-full pl-10 p-3 bg-[#0F0518] rounded border border-netzach-border text-white" onChange={e => setNewService({...newService, payment_url: e.target.value})} value={newService.payment_url}/></div>
                <textarea rows={2} placeholder="Descrição" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white" onChange={e => setNewService({...newService, description: e.target.value})} value={newService.description}/>
                <button onClick={handleCreateService} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded font-bold">Adicionar ao Catálogo</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">{catalog.map(item => (<div key={item.id} className="p-4 border border-netzach-border rounded-xl flex justify-between bg-[#0F0518]"><div className="flex-1"><h4 className="font-bold text-netzach-gold">{item.title}</h4><p className="text-xs text-netzach-muted">R$ {item.price}</p></div><button onClick={() => handleDeleteService(item.id)} className="text-red-400 p-2"><Trash2 size={18}/></button></div>))}</div>
        </div>
      )}

      {/* 4. RITUAIS (Aba Estrela) */}
      {activeTab === 'rituais' && (
        <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-4">
            <h2 className="text-xl font-mystic text-white">Novo Ritual</h2>
            <input placeholder="Título do Ritual" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" onChange={e => setRitualData({...ritualData, title: e.target.value})} value={ritualData.title}/>
            <textarea rows={3} placeholder="Ingredientes necessários..." className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" onChange={e => setRitualData({...ritualData, materials: e.target.value})} value={ritualData.materials}/>
            <textarea rows={4} placeholder="Como fazer (Passo a passo)..." className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" onChange={e => setRitualData({...ritualData, description: e.target.value})} value={ritualData.description}/>
            <div className="flex gap-4">
                <select className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" value={ritualData.moon_phase} onChange={e => setRitualData({...ritualData, moon_phase: e.target.value})}>
                    <option value="Qualquer">Fase da Lua (Opcional)</option><option value="Nova">Nova</option><option value="Crescente">Crescente</option><option value="Cheia">Cheia</option><option value="Minguante">Minguante</option>
                </select>
                <button onClick={handleSaveRitual} disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold hover:bg-white transition-all">{loading ? 'Salvando...' : 'Adicionar ao Grimório'}</button>
            </div>
        </div>
      )}

      {/* 5. PEDIDOS (Aba Pena) */}
      {activeTab === 'servicos' && (
        <div className="grid gap-4 max-w-4xl">
            {requests.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-netzach-border text-netzach-muted rounded-xl">
                    <Feather size={48} className="mx-auto mb-2 opacity-50"/>
                    Nenhum pedido de serviço pendente no momento.
                </div>
            ) : (
                requests.map(req => (<div key={req.id} className="bg-netzach-card p-4 rounded-xl border border-netzach-border flex justify-between"><div><span className="text-netzach-gold font-bold">{req.service_type}</span><h4 className="text-white">{req.profiles?.full_name}</h4><p className="text-sm italic">"{req.user_notes}"</p></div>{req.status !== 'completed' && <button onClick={() => handleCompleteRequest(req.id)} className="text-green-400 bg-netzach-bg p-2 rounded-full border border-green-900"><CheckCircle size={24}/></button>}</div>))
            )}
        </div>
      )}

      {/* 6. INICIADAS */}
      {activeTab === 'iniciadas' && (
        <div>
            <div className="bg-netzach-card p-4 rounded-xl mb-4 flex gap-2"><Search className="text-netzach-muted"/><input placeholder="Buscar aluna..." className="bg-transparent w-full outline-none text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
            <div className="bg-netzach-card rounded-xl overflow-hidden">{filteredUsers.map(user => (<div key={user.id} className="p-4 border-b border-netzach-border flex justify-between items-center"><div><p className="font-bold">{user.full_name}</p><p className="text-xs text-netzach-muted">{user.whatsapp} • {user.sign_sun}</p></div>{user.role !== 'admin' && (<button onClick={() => toggleUserStatus(user.id, user.subscription_status)} className={user.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'}>{user.subscription_status === 'active' ? <CheckCircle/> : <Ban/>}</button>)}</div>))}</div>
        </div>
      )}
    </div>
  );
}
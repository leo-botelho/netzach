import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Star, Sun, Sparkles, LayoutGrid, Trash2, 
  Link as LinkIcon, Users, Search, Power, Ban, Check, Feather, CheckCircle, Moon 
} from 'lucide-react';

const SIGNOS = ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('energia');
  const [loading, setLoading] = useState(false);

  // Estados de Formulário
  const [insightForm, setInsightForm] = useState({ tarot_card_id: '', recommended_bath: '', moon_phase: 'Crescente', card_image_url: '', card_meaning: '' });
  const [selectedSign, setSelectedSign] = useState('Geral');
  const [predictionText, setPredictionText] = useState('');
  const [ritualData, setRitualData] = useState({ title: '', description: '', materials: '', moon_phase: 'Qualquer' });
  const [newService, setNewService] = useState({ title: '', description: '', price: '', payment_url: '' });
  
  // Dados Listados
  const [catalog, setCatalog] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAdmin();
    fetchRequests();
    fetchCatalog();
    fetchUsers();
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

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if(data) setUsers(data);
  };

  const toggleUserStatus = async (id: string, current: string) => {
    if(!confirm("Alterar status?")) return;
    const novo = current === 'active' ? 'inactive' : 'active';
    await supabase.from('profiles').update({ subscription_status: novo }).eq('id', id);
    fetchUsers();
  };

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
    if (!error) alert("Salvo!");
    else alert(error.message);
  };

  const handleSavePrediction = async () => {
    setLoading(true);
    const type = selectedSign === 'Geral' ? 'sky_weekly' : 'sign_weekly';
    const signKey = selectedSign === 'Geral' ? 'ceu_semana' : selectedSign.toLowerCase();
    await supabase.from('horoscopes').delete().match({ sign: signKey, type });
    await supabase.from('horoscopes').insert({ sign: signKey, type, content: predictionText, valid_date: new Date().toISOString() });
    setLoading(false);
    alert("Publicado!");
  };

  const handleCreateService = async () => {
    await supabase.from('services_catalog').insert({ ...newService, price: parseFloat(newService.price), payment_url: newService.payment_url || null });
    setNewService({ title: '', description: '', price: '', payment_url: '' });
    fetchCatalog();
    alert("Criado!");
  };

  const handleSaveRitual = async () => {
    setLoading(true);
    const { error } = await supabase.from('rituals').insert({ ...ritualData, category: 'ritual' });
    setLoading(false);
    if (!error) { alert("Ritual criado!"); setRitualData({ title: '', description: '', materials: '', moon_phase: 'Qualquer' }); }
  };

  const fetchCatalog = async () => { const { data } = await supabase.from('services_catalog').select('*'); if(data) setCatalog(data); };
  const handleDeleteService = async (id: string) => { if(confirm("Excluir?")) { await supabase.from('services_catalog').delete().eq('id', id); fetchCatalog(); } };
  
  const fetchRequests = async () => { const { data } = await supabase.from('service_requests').select('*, profiles(full_name, whatsapp)').order('created_at', { ascending: false }); if(data) setRequests(data); };
  const handleCompleteRequest = async (id: string) => { await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id); fetchRequests(); };

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans p-6">
      <header className="mb-8 border-b border-netzach-border pb-4 flex justify-between items-center">
        <div><h1 className="text-3xl font-mystic text-netzach-gold">Painel da Sacerdotisa</h1><p className="text-netzach-muted text-sm">Gestão do Templo Digital</p></div>
        <button onClick={() => navigate('/templo')} className="text-xs border border-netzach-border px-3 py-2 rounded hover:bg-netzach-card">Voltar</button>
      </header>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {[ { id: 'energia', icon: Sparkles }, { id: 'previsoes', icon: Sun }, { id: 'catalogo', icon: LayoutGrid }, { id: 'servicos', icon: Feather }, { id: 'rituais', icon: Star }, { id: 'iniciadas', icon: Users } ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-lg border ${activeTab === tab.id ? 'bg-netzach-gold text-netzach-bg' : 'text-netzach-muted'}`}><tab.icon size={18}/></button>
        ))}
      </div>

      {activeTab === 'iniciadas' && (
        <div>
            <div className="bg-netzach-card p-4 rounded-xl mb-4 flex gap-2"><Search className="text-netzach-muted"/><input placeholder="Buscar aluna..." className="bg-transparent w-full outline-none text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
            <div className="bg-netzach-card rounded-xl overflow-hidden">
                {filteredUsers.map(user => (
                    <div key={user.id} className="p-4 border-b border-netzach-border flex justify-between items-center">
                        <div><p className="font-bold">{user.full_name}</p><p className="text-xs text-netzach-muted">{user.whatsapp} • {user.sign_sun}</p></div>
                        {user.role !== 'admin' && (<button onClick={() => toggleUserStatus(user.id, user.subscription_status)} className={user.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'}>{user.subscription_status === 'active' ? <CheckCircle/> : <Ban/>}</button>)}
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeTab === 'energia' && (
        <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-4">
            <h2 className="text-xl font-mystic text-white mb-2">Definir Energia</h2>
            <input placeholder="Arcano" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" value={insightForm.tarot_card_id} onChange={e => setInsightForm({...insightForm, tarot_card_id: e.target.value})}/>
            <input placeholder="URL Imagem" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" value={insightForm.card_image_url} onChange={e => setInsightForm({...insightForm, card_image_url: e.target.value})}/>
            <textarea rows={4} placeholder="Interpretação" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" value={insightForm.card_meaning} onChange={e => setInsightForm({...insightForm, card_meaning: e.target.value})}/>
            <input placeholder="Banho" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" value={insightForm.recommended_bath} onChange={e => setInsightForm({...insightForm, recommended_bath: e.target.value})}/>
            <button onClick={handleSaveInsight} disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold">{loading ? '...' : 'Salvar'}</button>
        </div>
      )}
      
      {activeTab === 'previsoes' && (
        <div className="bg-netzach-card p-6 rounded-2xl space-y-4 max-w-2xl">
            <select className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" value={selectedSign} onChange={e => setSelectedSign(e.target.value)}><option value="Geral">Céu da Semana</option>{SIGNOS.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <textarea rows={6} className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" value={predictionText} onChange={e => setPredictionText(e.target.value)}/>
            <button onClick={handleSavePrediction} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold">Publicar</button>
        </div>
      )}

      {activeTab === 'catalogo' && (
        <div className="space-y-6">
            <div className="bg-netzach-card p-6 rounded-2xl space-y-4 max-w-2xl">
                <input placeholder="Título" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" onChange={e => setNewService({...newService, title: e.target.value})} value={newService.title}/>
                <input placeholder="Preço" type="number" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" onChange={e => setNewService({...newService, price: e.target.value})} value={newService.price}/>
                <input placeholder="Link Pagamento" className="w-full p-3 bg-[#0F0518] rounded border border-netzach-border text-white" onChange={e => setNewService({...newService, payment_url: e.target.value})} value={newService.payment_url}/>
                <button onClick={handleCreateService} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded font-bold">Adicionar</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                {catalog.map(item => (<div key={item.id} className="p-4 border border-netzach-border rounded-xl flex justify-between bg-[#0F0518]"><div><h4 className="font-bold text-netzach-gold">{item.title}</h4><p className="text-xs text-netzach-muted">R$ {item.price}</p></div><button onClick={() => handleDeleteService(item.id)} className="text-red-400"><Trash2 size={18}/></button></div>))}
            </div>
        </div>
      )}

      {activeTab === 'servicos' && (<div className="grid gap-4 max-w-4xl">{requests.map(req => (<div key={req.id} className="bg-netzach-card p-4 rounded-xl border border-netzach-border flex justify-between"><div><span className="text-netzach-gold font-bold">{req.service_type}</span><h4 className="text-white">{req.profiles?.full_name}</h4><p className="text-sm italic">"{req.user_notes}"</p></div>{req.status !== 'completed' && <button onClick={() => handleCompleteRequest(req.id)} className="text-green-400"><CheckCircle size={24}/></button>}</div>))}</div>)}
      
      {activeTab === 'rituais' && (<div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border max-w-3xl space-y-4"><input placeholder="Título" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" onChange={e => setRitualData({...ritualData, title: e.target.value})} value={ritualData.title}/> <textarea rows={3} placeholder="Ingredientes" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" onChange={e => setRitualData({...ritualData, materials: e.target.value})} value={ritualData.materials}/> <textarea rows={4} placeholder="Como fazer" className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded-lg text-white" onChange={e => setRitualData({...ritualData, description: e.target.value})} value={ritualData.description}/> <button onClick={handleSaveRitual} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold">Adicionar</button></div>)}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Star, Feather, CheckCircle, Sun, Sparkles, LayoutGrid, Trash2,
  Link as LinkIcon, Users, Search, Ban, Bot, Plus, CreditCard, Save, ToggleLeft, ToggleRight,
  BookOpen, Upload, Loader2
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

  // Base de Conhecimento
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [knowledgeForm, setKnowledgeForm] = useState({ title: '', content: '', category: 'banho' });
  const [kbLoading, setKbLoading] = useState(false);

  // Ingestão em lote
  const [bulkForm, setBulkForm] = useState({ source_title: '', text: '', category: 'geral' });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ inserted: number; total_chunks: number; errors?: string[] } | null>(null);

  // Planos
  const [plans, setPlans] = useState<any[]>([]);
  const [planSaving, setPlanSaving] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchRequests();
    fetchCatalog();
    fetchUsers();
    loadTodayInsight();
    fetchKnowledge();
    fetchPlans();
  }, []);

  useEffect(() => {
    if (activeTab === 'conhecimento') fetchKnowledge();
  }, [activeTab]);

  const fetchPlans = async () => {
    const { data } = await supabase.from('plan_configs').select('*').order('id');
    if (data) setPlans(data.map(p => ({ ...p, _price: String(p.price) })));
  };

  const savePlan = async (plan: any) => {
    setPlanSaving(plan.id);
    const price = parseFloat(plan._price.replace(',', '.'));
    if (isNaN(price) || price <= 0) { alert('Preço inválido'); setPlanSaving(null); return; }
    await supabase.from('plan_configs').update({ price, active: plan.active, updated_at: new Date().toISOString() }).eq('id', plan.id);
    setPlanSaving(null);
    await fetchPlans();
  };

  const updatePlanField = (id: string, field: string, value: any) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

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
  const sendPushToAll = async (title: string, body: string, url = '/templo') => {
    await supabase.functions.invoke('send-push', { body: { title, body, url } });
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
    if (!error) {
      await sendPushToAll(
        `✦ Arcano da Semana: ${insightForm.tarot_card_id}`,
        insightForm.card_meaning?.slice(0, 100) + '...' || 'A energia da semana foi atualizada.',
        '/templo'
      );
    }
    setLoading(false);
    if (!error) alert("Arcano da semana salvo e notificação enviada!");
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
  
  const handleSavePrediction = async () => {
    setLoading(true);
    const type = selectedSign === 'Geral' ? 'sky_weekly' : 'sign_weekly';
    const signKey = selectedSign === 'Geral' ? 'ceu_semana' : selectedSign.toLowerCase();
    await supabase.from('horoscopes').delete().match({ sign: signKey, type });
    const { error } = await supabase.from('horoscopes').insert({ sign: signKey, type, content: predictionText, valid_date: new Date().toISOString() });
    if (!error && selectedSign === 'Geral') {
      await sendPushToAll(
        '🌙 Céu da Semana atualizado',
        predictionText.slice(0, 120) + '...',
        '/templo'
      );
    }
    setLoading(false);
    alert(error ? 'Erro: ' + error.message : selectedSign === 'Geral' ? 'Publicado e notificação enviada!' : 'Publicado!');
  };
  
  const handleCreateService = async () => { await supabase.from('services_catalog').insert({ ...newService, price: parseFloat(newService.price), payment_url: newService.payment_url || null }); setNewService({ title: '', description: '', price: '', payment_url: '' }); fetchCatalog(); alert("Criado!"); };
  const fetchCatalog = async () => { const { data } = await supabase.from('services_catalog').select('*').order('created_at'); if(data) setCatalog(data); };
  const handleDeleteService = async (id: string) => { if(confirm("Excluir?")) { await supabase.from('services_catalog').delete().eq('id', id); fetchCatalog(); } };
  
  const fetchRequests = async () => { const { data } = await supabase.from('service_requests').select('*, profiles(full_name, whatsapp)').order('created_at', { ascending: false }); if(data) setRequests(data); };

  const fetchKnowledge = async () => { const { data } = await supabase.from('knowledge_base').select('id, title, category, created_at').order('created_at', { ascending: false }); if(data) setKnowledgeList(data); };

  const handleAddKnowledge = async () => {
    if (!knowledgeForm.title || !knowledgeForm.content) return alert('Título e conteúdo são obrigatórios.');
    setKbLoading(true);
    const { error } = await supabase.functions.invoke('ingest-knowledge', {
      body: knowledgeForm,
    });
    setKbLoading(false);
    if (!error) {
      alert('Conhecimento adicionado e embedding gerado!');
      setKnowledgeForm({ title: '', content: '', category: 'banho' });
      fetchKnowledge();
    } else {
      alert('Erro: ' + (error.message || 'Verifique se a Edge Function está deployada.'));
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('Excluir este conhecimento?')) return;
    await supabase.from('knowledge_base').delete().eq('id', id);
    fetchKnowledge();
  };

  const handleBulkIngest = async () => {
    if (!bulkForm.source_title || !bulkForm.text) return alert('Título e texto são obrigatórios.');
    if (bulkForm.text.split(/\s+/).length < 50) return alert('Texto muito curto — cole pelo menos um capítulo.');
    setBulkLoading(true);
    setBulkResult(null);
    const { data, error } = await supabase.functions.invoke('ingest-bulk', { body: bulkForm });
    setBulkLoading(false);
    if (error) {
      alert('Erro ao chamar a função: ' + error.message);
      return;
    }
    if (data?.error) {
      alert('Erro: ' + data.error);
      return;
    }
    setBulkResult(data);
    fetchKnowledge();
  };

  const handleBulkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBulkForm(f => ({ ...f, text: ev.target?.result as string ?? '' }));
    reader.readAsText(file, 'utf-8');
  };
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
            { id: 'iniciadas', icon: Users, label: '6. Alunas' },
            { id: 'conhecimento', icon: Bot, label: '7. Netzach IA' },
            { id: 'planos', icon: CreditCard, label: '8. Planos' },
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

      {/* 7. BASE DE CONHECIMENTO */}
      {activeTab === 'conhecimento' && (
        <div className="space-y-6 max-w-3xl">

          {/* INGESTÃO EM LOTE — livro/capítulo completo */}
          <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-gold/30 space-y-4">
            <h2 className="text-xl font-mystic text-netzach-gold flex items-center gap-2">
              <BookOpen size={20}/> Ingerir Livro ou Capítulo Completo
            </h2>
            <p className="text-xs text-netzach-muted">
              Cole o texto completo — o sistema divide automaticamente em chunks de ~300 palavras com overlap,
              gera embedding de cada um e indexa tudo de uma vez. Para PDFs: converta para .txt antes de colar.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Título do livro ou fonte (ex: O Poder do Agora)"
                className="col-span-2 p-3 bg-[#0F0518] border border-netzach-border rounded text-white text-sm"
                value={bulkForm.source_title}
                onChange={e => setBulkForm(f => ({ ...f, source_title: e.target.value }))}
              />
              <select
                className="p-3 bg-[#0F0518] border border-netzach-border rounded text-white text-sm"
                value={bulkForm.category}
                onChange={e => setBulkForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="banho">Banho</option>
                <option value="oleo">Óleo Essencial</option>
                <option value="floral">Floral de Bach</option>
                <option value="cristal">Cristal</option>
                <option value="ritual">Ritual</option>
                <option value="numerologia">Numerologia</option>
                <option value="astrologia">Astrologia</option>
                <option value="ciclo_feminino">Ciclo Feminino</option>
                <option value="chakra">Chakra</option>
                <option value="tarot">Tarot</option>
                <option value="ervas">Ervas</option>
                <option value="hooponopono">Ho'oponopono</option>
                <option value="relacionamento">Relacionamento</option>
                <option value="lei_atracao">Lei da Atração</option>
                <option value="geral">Geral</option>
              </select>
              <label className="flex items-center gap-2 p-3 bg-[#0F0518] border border-netzach-border rounded text-netzach-muted text-sm cursor-pointer hover:border-netzach-gold transition-colors">
                <Upload size={14}/> Carregar arquivo .txt / .md
                <input type="file" accept=".txt,.md" className="hidden" onChange={handleBulkFile}/>
              </label>
            </div>

            <textarea
              rows={10}
              placeholder="Cole aqui o texto completo do livro ou capítulo..."
              className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white text-sm font-mono leading-relaxed"
              value={bulkForm.text}
              onChange={e => setBulkForm(f => ({ ...f, text: e.target.value }))}
            />

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-netzach-muted">
                {bulkForm.text ? `~${bulkForm.text.split(/\s+/).filter(Boolean).length.toLocaleString('pt-BR')} palavras detectadas` : 'Nenhum texto'}
              </span>
              <button
                onClick={handleBulkIngest}
                disabled={bulkLoading}
                className="bg-netzach-gold text-netzach-bg px-6 py-3 rounded font-bold hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {bulkLoading
                  ? <><Loader2 size={15} className="animate-spin"/> Processando chunks...</>
                  : <><BookOpen size={15}/> Processar e Indexar</>
                }
              </button>
            </div>

            {bulkResult && (
              <div className={`rounded-xl p-4 text-sm space-y-1 ${bulkResult.errors?.length ? 'bg-yellow-900/20 border border-yellow-700/40' : 'bg-green-900/20 border border-green-700/40'}`}>
                <p className={bulkResult.errors?.length ? 'text-yellow-300' : 'text-green-300'}>
                  ✦ {bulkResult.inserted} de {bulkResult.total_chunks} chunks indexados com sucesso.
                </p>
                {bulkResult.errors?.map((e, i) => (
                  <p key={i} className="text-red-400 text-xs">{e}</p>
                ))}
              </div>
            )}
          </div>

          {/* CHUNK ÚNICO */}
          <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-border space-y-4">
            <h2 className="text-xl font-mystic text-white flex items-center gap-2"><Bot size={20} className="text-netzach-gold"/> Adicionar Conhecimento</h2>
            <p className="text-xs text-netzach-muted">O texto será convertido em embedding (gte-small) e indexado para busca semântica.</p>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Título (ex: Banho de Arruda)"
                className="col-span-2 p-3 bg-[#0F0518] border border-netzach-border rounded text-white"
                value={knowledgeForm.title}
                onChange={e => setKnowledgeForm({...knowledgeForm, title: e.target.value})}
              />
              <select
                className="p-3 bg-[#0F0518] border border-netzach-border rounded text-white"
                value={knowledgeForm.category}
                onChange={e => setKnowledgeForm({...knowledgeForm, category: e.target.value})}
              >
                <option value="banho">Banho</option>
                <option value="oleo">Óleo Essencial</option>
                <option value="floral">Floral de Bach</option>
                <option value="cristal">Cristal</option>
                <option value="ritual">Ritual</option>
                <option value="numerologia">Numerologia</option>
                <option value="astrologia">Astrologia</option>
                <option value="ciclo_feminino">Ciclo Feminino</option>
                <option value="chakra">Chakra</option>
                <option value="tarot">Tarot</option>
                <option value="ervas">Ervas</option>
                <option value="hooponopono">Ho'oponopono</option>
                <option value="relacionamento">Relacionamento</option>
                <option value="lei_atracao">Lei da Atração</option>
                <option value="geral">Geral</option>
              </select>
              <div className="flex items-center text-xs text-netzach-muted bg-[#0F0518] border border-netzach-border rounded px-3">
                {knowledgeList.length} itens na base
              </div>
            </div>
            <textarea
              rows={6}
              placeholder="Conteúdo detalhado (até ~500 palavras por chunk)..."
              className="w-full p-3 bg-[#0F0518] border border-netzach-border rounded text-white text-sm"
              value={knowledgeForm.content}
              onChange={e => setKnowledgeForm({...knowledgeForm, content: e.target.value})}
            />
            <button
              onClick={handleAddKnowledge}
              disabled={kbLoading}
              className="w-full bg-netzach-gold text-netzach-bg py-3 rounded font-bold hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={16}/> {kbLoading ? 'Gerando embedding...' : 'Adicionar à Base'}
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {knowledgeList.map(item => (
              <div key={item.id} className="bg-[#0F0518] border border-netzach-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold mr-2">{item.category}</span>
                  <span className="text-sm text-white">{item.title}</span>
                </div>
                <button onClick={() => handleDeleteKnowledge(item.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={16}/></button>
              </div>
            ))}
            {knowledgeList.length === 0 && (
              <div className="text-center py-8 text-netzach-muted text-sm border border-dashed border-netzach-border rounded-xl">
                Nenhum conhecimento cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. INICIADAS */}
      {activeTab === 'iniciadas' && (
        <div>
            <div className="bg-netzach-card p-4 rounded-xl mb-4 flex gap-2"><Search className="text-netzach-muted"/><input placeholder="Buscar aluna..." className="bg-transparent w-full outline-none text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
            <div className="bg-netzach-card rounded-xl overflow-hidden">{filteredUsers.map(user => (<div key={user.id} className="p-4 border-b border-netzach-border flex justify-between items-center"><div><p className="font-bold">{user.full_name}</p><p className="text-xs text-netzach-muted">{user.whatsapp} • {user.sign_sun}</p></div>{user.role !== 'admin' && (<button onClick={() => toggleUserStatus(user.id, user.subscription_status)} className={user.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'}>{user.subscription_status === 'active' ? <CheckCircle/> : <Ban/>}</button>)}</div>))}</div>
        </div>
      )}

      {/* 8. PLANOS */}
      {activeTab === 'planos' && (
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-xl font-mystic text-white">Gerenciar Planos</h2>
          <p className="text-sm text-netzach-muted">Edite os preços cobrados no checkout. Alterações entram em vigor imediatamente para novas assinaturas.</p>

          <div className="bg-netzach-card border border-netzach-border rounded-2xl overflow-hidden">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-netzach-bg/50 border-b border-netzach-border text-[11px] uppercase tracking-wider text-netzach-muted font-bold">
              <span>Plano</span>
              <span>Ciclo</span>
              <span>Preço (R$)</span>
              <span>Ativo</span>
            </div>

            {plans.map(plan => (
              <div key={plan.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-netzach-border last:border-0">
                {/* Nome */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">{plan.symbol}</span>
                  <div>
                    <p className="font-mystic text-white text-sm">{plan.name}</p>
                    <p className="text-[10px] text-netzach-muted">{plan.id}</p>
                  </div>
                </div>

                {/* Ciclo */}
                <span className="text-sm text-netzach-muted capitalize">{plan.cycle}</span>

                {/* Preço editável */}
                <input
                  type="text"
                  value={plan._price}
                  onChange={e => updatePlanField(plan.id, '_price', e.target.value)}
                  className="bg-netzach-bg border border-netzach-border rounded-lg px-3 py-1.5 text-sm text-white w-24 text-right"
                  placeholder="0,00"
                />

                {/* Ativo toggle + Salvar */}
                <div className="flex items-center gap-2">
                  <button onClick={() => updatePlanField(plan.id, 'active', !plan.active)} className={plan.active ? 'text-green-400' : 'text-netzach-muted'}>
                    {plan.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => savePlan(plan)}
                    disabled={planSaving === plan.id}
                    className="p-1.5 bg-netzach-gold text-netzach-bg rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                    title="Salvar"
                  >
                    {planSaving === plan.id ? '...' : <Save size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-netzach-card border border-amber-700/30 rounded-xl p-4 text-sm text-amber-400/80 space-y-1">
            <p className="font-bold text-amber-400">Importante</p>
            <p>Alterar preço NÃO altera assinaturas existentes no Asaas. Apenas novas cobranças usarão o novo valor.</p>
            <p>Para desativar um plano sem cancelar assinantes, use o toggle Ativo (plano não aparece no checkout).</p>
          </div>
        </div>
      )}
    </div>
  );
}
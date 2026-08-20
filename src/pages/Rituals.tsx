import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Feather, Moon, Sparkles, BookMarked, Trash2 } from 'lucide-react';

interface Ritual {
  id: string;
  title: string;
  description: string;
  materials: string;
  category: string;
  moon_phase?: string;
}

interface SavedNote {
  id: string;
  prompt: string | null;
  response: string;
  created_at: string;
}

export default function Rituals() {
  const navigate = useNavigate();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rituais' | 'anotacoes'>('rituais');

  useEffect(() => {
    fetchRituals();
    fetchNotes();
  }, []);

  const fetchRituals = async () => {
    try {
      const { data } = await supabase
        .from('rituals')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setRituals(data);
    } catch (err) {
      console.error('Erro ao carregar rituais:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from('sacerdotisa_history')
      .select('id, prompt, response, created_at')
      .eq('user_id', session.user.id)
      .eq('saved', true)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
  };

  const deleteNote = async (id: string) => {
    await supabase.from('sacerdotisa_history').update({ saved: false }).eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return (
    <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic">
      Abrindo o Grimório...
    </div>
  );

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/templo')} className="text-netzach-muted hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-mystic text-netzach-gold text-lg leading-none flex items-center gap-2">
            <Feather size={18} /> Grimório Sagrado
          </h1>
          <p className="text-[10px] text-netzach-muted uppercase tracking-widest mt-0.5">Sabedoria Ancestral</p>
        </div>
      </header>

      {/* Abas */}
      <div className="flex border-b border-netzach-border px-5">
        <button
          onClick={() => setActiveTab('rituais')}
          className={`py-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'rituais'
              ? 'border-netzach-gold text-netzach-gold'
              : 'border-transparent text-netzach-muted hover:text-white'
          }`}
        >
          Rituais
        </button>
        <button
          onClick={() => setActiveTab('anotacoes')}
          className={`py-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'anotacoes'
              ? 'border-netzach-gold text-netzach-gold'
              : 'border-transparent text-netzach-muted hover:text-white'
          }`}
        >
          <BookMarked size={14} /> Minhas Anotações
          {notes.length > 0 && (
            <span className="text-[10px] bg-netzach-gold/20 text-netzach-gold px-1.5 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Tab: Rituais */}
        {activeTab === 'rituais' && (
          <>
            {rituals.length === 0 && (
              <div className="text-center p-10 border border-dashed border-netzach-border rounded-xl text-netzach-muted">
                O grimório ainda está sendo escrito pela Sacerdotisa.
              </div>
            )}
            {rituals.map(ritual => (
              <div key={ritual.id} className="bg-netzach-card p-5 rounded-xl border border-netzach-border hover:border-netzach-gold/50 transition-all group relative overflow-hidden shadow-lg">
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <h3 className="text-lg font-mystic text-white group-hover:text-netzach-gold transition-colors">{ritual.title}</h3>
                  {ritual.moon_phase && ritual.moon_phase !== 'Qualquer' && (
                    <span className="text-[10px] uppercase tracking-wider bg-netzach-deep border border-netzach-border px-2 py-1 rounded flex items-center gap-1 text-netzach-muted">
                      <Moon size={10} /> {ritual.moon_phase}
                    </span>
                  )}
                </div>
                <p className="text-sm text-netzach-text/80 mb-4 leading-relaxed relative z-10">{ritual.description}</p>
                {ritual.materials && (
                  <div className="bg-netzach-deep/50 p-4 rounded-lg border border-netzach-border/50 text-sm relative z-10">
                    <strong className="text-netzach-gold block mb-2 text-xs uppercase flex items-center gap-1">
                      <Sparkles size={12} /> Ingredientes Necessários:
                    </strong>
                    <p className="text-netzach-muted font-light whitespace-pre-wrap">{ritual.materials}</p>
                  </div>
                )}
                <div className="absolute top-0 right-0 p-10 bg-netzach-accent/5 blur-[60px] rounded-full pointer-events-none" />
              </div>
            ))}
          </>
        )}

        {/* Tab: Minhas Anotações */}
        {activeTab === 'anotacoes' && (
          <>
            {notes.length === 0 && (
              <div className="text-center p-10 border border-dashed border-netzach-border rounded-xl text-netzach-muted text-sm">
                <BookMarked size={28} className="mx-auto mb-3 opacity-40" />
                Nenhuma anotação salva ainda. Consulte a Sacerdotisa e salve as respostas que ressoarem com você.
              </div>
            )}
            {notes.map(note => (
              <div key={note.id} className="bg-netzach-card border border-netzach-border rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookMarked size={14} className="text-netzach-gold shrink-0 mt-0.5" />
                    {note.prompt && (
                      <p className="text-xs text-netzach-muted italic line-clamp-1">"{note.prompt}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-netzach-muted">{formatDate(note.created_at)}</span>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-netzach-muted hover:text-red-400 transition-colors p-0.5"
                      title="Remover do Grimório"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-netzach-text leading-relaxed whitespace-pre-wrap">{note.response}</p>
              </div>
            ))}
          </>
        )}

      </main>
    </div>
  );
}
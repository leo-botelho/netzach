import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, User, Calendar, MapPin, Droplet, Weight, Sparkles, Check, Bell } from 'lucide-react';
import type { Profile } from '../types';

const INTENTIONS = [
  'Autoconhecimento e cura interior',
  'Equilíbrio emocional',
  'Despertar espiritual',
  'Abundância e prosperidade',
  'Saúde e bem-estar',
  'Relacionamentos e amor',
  'Propósito de vida',
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    whatsapp: '',
    birth_date: '',
    birth_time: '',
    birth_city: '',
    last_period_date: '',
    cycle_duration: '28',
    period_duration: '5',
    weight: '',
    height: '',
    main_intention: '',
  });

  const [notifPrefs, setNotifPrefs] = useState({
    morning_checkin: true,
    hydration: true,
    lunch_tea: false,
    evening_checkin: true,
    night_tea: false,
    weekly_tarot: true,
    credits_renewed: true,
    credits_unused: true,
    lunar_phase: true,
    monthly_retro: true,
    monthly_wheel: true,
    morning_time: '07:00',
    evening_time: '21:00',
  });
  const [notifPrefsId, setNotifPrefsId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');

    const [{ data }, { data: prefs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
      supabase.from('notification_preferences').select('*').eq('user_id', session.user.id).single(),
    ]);

    if (data) {
      setProfile(data as Profile);
      setForm({
        full_name: data.full_name || '',
        whatsapp: data.whatsapp || '',
        birth_date: data.birth_date || '',
        birth_time: data.birth_time || '',
        birth_city: data.birth_city || '',
        last_period_date: data.last_period_date || '',
        cycle_duration: String(data.cycle_duration || 28),
        period_duration: String(data.period_duration || 5),
        weight: data.weight ? String(data.weight) : '',
        height: data.height ? String(data.height) : '',
        main_intention: data.main_intention || '',
      });
    }
    if (prefs) {
      setNotifPrefsId(prefs.id);
      setNotifPrefs({
        morning_checkin: prefs.morning_checkin ?? true,
        hydration: prefs.hydration ?? true,
        lunch_tea: prefs.lunch_tea ?? false,
        evening_checkin: prefs.evening_checkin ?? true,
        night_tea: prefs.night_tea ?? false,
        weekly_tarot: prefs.weekly_tarot ?? true,
        credits_renewed: prefs.credits_renewed ?? true,
        credits_unused: prefs.credits_unused ?? true,
        lunar_phase: prefs.lunar_phase ?? true,
        monthly_retro: prefs.monthly_retro ?? true,
        monthly_wheel: prefs.monthly_wheel ?? true,
        morning_time: prefs.morning_time || '07:00',
        evening_time: prefs.evening_time || '21:00',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const birthDataChanged =
      form.birth_date !== (profile.birth_date ?? '') ||
      form.birth_time !== (profile.birth_time ?? '') ||
      form.birth_city !== (profile.birth_city ?? '');

    const payload: Partial<Profile> = {
      full_name: form.full_name,
      whatsapp: form.whatsapp || undefined,
      birth_date: form.birth_date || undefined,
      birth_time: form.birth_time || undefined,
      birth_city: form.birth_city || undefined,
      last_period_date: form.last_period_date || undefined,
      cycle_duration: form.cycle_duration ? Number(form.cycle_duration) : undefined,
      period_duration: form.period_duration ? Number(form.period_duration) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      height: form.height ? Number(form.height) : undefined,
      main_intention: form.main_intention || undefined,
    };

    await supabase.from('profiles').update(payload).eq('id', profile.id);

    // Recalcula mapa astral se dados de nascimento mudaram
    if (birthDataChanged && form.birth_date && form.birth_city) {
      supabase.functions.invoke('calculate-astral-chart', {
        body: {
          user_id: profile.user_id,
          birth_date: form.birth_date,
          birth_time: form.birth_time || null,
          birth_city: form.birth_city,
        },
      }).then(({ data }) => {
        if (data?.sign_sun) {
          setProfile(p => p ? {
            ...p,
            sign_sun: data.sign_sun,
            sign_moon: data.sign_moon,
            sign_rising: data.sign_rising,
          } : p);
        }
      });
    }

    // Salva preferências de notificação (upsert por user_id)
    if (notifPrefsId) {
      await supabase.from('notification_preferences').update(notifPrefs).eq('id', notifPrefsId);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('notification_preferences').upsert({ user_id: session.user.id, ...notifPrefs });
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text pb-24 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Meu Perfil</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Dados pessoais e sagrados</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
            saved
              ? 'bg-green-700/30 border border-green-600/50 text-green-400'
              : 'bg-netzach-gold text-netzach-bg hover:bg-white'
          }`}
        >
          {saved ? <><Check size={15} /> Salvo</> : saving ? '...' : <><Save size={15} /> Salvar</>}
        </button>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6">

        {/* Dados básicos */}
        <Section icon={<User size={16} />} title="Dados Básicos">
          <Field label="Nome completo">
            <input
              type="text"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="input-mystic"
              placeholder="Seu nome"
            />
          </Field>
          <Field label="WhatsApp">
            <input
              type="tel"
              value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value)}
              className="input-mystic"
              placeholder="+55 11 99999-9999"
            />
          </Field>
        </Section>

        {/* Dados de nascimento */}
        <Section icon={<Calendar size={16} />} title="Nascimento">
          <p className="text-[11px] text-netzach-muted -mt-1 mb-3">
            Usados para calcular seu mapa astral (sol, lua e ascendente).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de nascimento">
              <input
                type="date"
                value={form.birth_date}
                onChange={e => set('birth_date', e.target.value)}
                className="input-mystic"
              />
            </Field>
            <Field label="Hora (opcional)">
              <input
                type="time"
                value={form.birth_time}
                onChange={e => set('birth_time', e.target.value)}
                className="input-mystic"
              />
            </Field>
          </div>
          <Field label="Cidade de nascimento">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-netzach-muted" />
              <input
                type="text"
                value={form.birth_city}
                onChange={e => set('birth_city', e.target.value)}
                className="input-mystic pl-8"
                placeholder="Ex: São Paulo, SP"
              />
            </div>
          </Field>
          {(profile?.sign_sun || profile?.sign_moon || profile?.sign_rising) && (
            <div className="bg-netzach-bg border border-netzach-border rounded-xl px-4 py-3 flex flex-wrap gap-3 text-xs text-netzach-muted">
              {profile.sign_sun && <span>☀️ Sol: <strong className="text-white">{profile.sign_sun}</strong></span>}
              {profile.sign_moon && <span>🌙 Lua: <strong className="text-white">{profile.sign_moon}</strong></span>}
              {profile.sign_rising && <span>⬆️ Asc: <strong className="text-white">{profile.sign_rising}</strong></span>}
            </div>
          )}
        </Section>

        {/* Ciclo */}
        <Section icon={<Droplet size={16} />} title="Ciclo Menstrual">
          <Field label="Início do último ciclo">
            <input
              type="date"
              value={form.last_period_date}
              onChange={e => set('last_period_date', e.target.value)}
              className="input-mystic"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duração do ciclo (dias)">
              <input
                type="number"
                value={form.cycle_duration}
                onChange={e => set('cycle_duration', e.target.value)}
                className="input-mystic text-center"
                min="21"
                max="45"
              />
            </Field>
            <Field label="Duração do período (dias)">
              <input
                type="number"
                value={form.period_duration}
                onChange={e => set('period_duration', e.target.value)}
                className="input-mystic text-center"
                min="1"
                max="10"
              />
            </Field>
          </div>
        </Section>

        {/* Corpo */}
        <Section icon={<Weight size={16} />} title="Corpo Sagrado">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (kg)">
              <div className="relative">
                <input
                  type="number"
                  value={form.weight}
                  onChange={e => set('weight', e.target.value)}
                  className="input-mystic pr-10"
                  placeholder="60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-netzach-muted">kg</span>
              </div>
            </Field>
            <Field label="Altura (cm)">
              <div className="relative">
                <input
                  type="number"
                  value={form.height}
                  onChange={e => set('height', e.target.value)}
                  className="input-mystic pr-10"
                  placeholder="165"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-netzach-muted">cm</span>
              </div>
            </Field>
          </div>
        </Section>

        {/* Intenção */}
        <Section icon={<Sparkles size={16} />} title="Intenção Principal">
          <p className="text-[11px] text-netzach-muted -mt-1 mb-3">
            O que você busca com a Netzach?
          </p>
          <div className="space-y-2">
            {INTENTIONS.map(intention => (
              <button
                key={intention}
                onClick={() => set('main_intention', intention)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  form.main_intention === intention
                    ? 'border-netzach-gold bg-netzach-gold/10 text-white'
                    : 'border-netzach-border text-netzach-muted hover:border-netzach-border/80 hover:text-white'
                }`}
              >
                {form.main_intention === intention && (
                  <Check size={12} className="inline mr-2 text-netzach-gold" />
                )}
                {intention}
              </button>
            ))}
          </div>
        </Section>

        {/* Notificações */}
        <Section icon={<Bell size={16} />} title="Notificações">
          <p className="text-[11px] text-netzach-muted -mt-1 mb-4">
            Escolha quais lembretes você quer receber.
          </p>

          <div className="space-y-1 mb-4">
            {([
              { key: 'morning_checkin',  label: 'Check-in matinal',           desc: 'Convite diário para começar o dia' },
              { key: 'evening_checkin',  label: 'Check-in noturno',           desc: 'Reflexão do seu dia' },
              { key: 'hydration',        label: 'Lembretes de hidratação',    desc: '3x ao dia' },
              { key: 'lunch_tea',        label: 'Chá pós-almoço',             desc: 'Digestão ayurvédica' },
              { key: 'night_tea',        label: 'Chá noturno',                desc: 'Encerramento do dia' },
              { key: 'weekly_tarot',     label: 'Tarô da semana',             desc: 'Sábados às 9h' },
              { key: 'credits_renewed',  label: 'Créditos renovados',         desc: 'Toda sexta-feira' },
              { key: 'credits_unused',   label: 'Créditos sobrando',          desc: 'Quinta-feira antes de expirar' },
              { key: 'lunar_phase',      label: 'Mudança de fase lunar',      desc: 'Na virada de cada fase' },
              { key: 'monthly_retro',    label: 'Retrospectiva mensal',       desc: 'Dia 1 de cada mês' },
              { key: 'monthly_wheel',    label: 'Roda da vida',               desc: 'Dia 2 de cada mês' },
            ] as Array<{ key: keyof typeof notifPrefs; label: string; desc: string }>).map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  notifPrefs[key]
                    ? 'border-netzach-gold/40 bg-netzach-gold/5'
                    : 'border-netzach-border opacity-60'
                }`}
              >
                <div className="text-left">
                  <p className={`text-sm ${notifPrefs[key] ? 'text-white' : 'text-netzach-muted'}`}>{label}</p>
                  <p className="text-[11px] text-netzach-muted">{desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  notifPrefs[key] ? 'bg-netzach-gold border-netzach-gold' : 'border-netzach-border'
                }`}>
                  {notifPrefs[key] && <Check size={11} className="text-netzach-bg" />}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Horário matinal">
              <input type="time" value={notifPrefs.morning_time}
                onChange={e => setNotifPrefs(p => ({ ...p, morning_time: e.target.value }))}
                className="input-mystic text-center" />
            </Field>
            <Field label="Horário noturno">
              <input type="time" value={notifPrefs.evening_time}
                onChange={e => setNotifPrefs(p => ({ ...p, evening_time: e.target.value }))}
                className="input-mystic text-center" />
            </Field>
          </div>
        </Section>

        {/* Plano */}
        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-netzach-muted uppercase tracking-wider">Plano atual</p>
            <p className="font-mystic text-netzach-gold text-base mt-0.5 capitalize">
              {profile?.plan_type === 'hecate' ? 'Sacerdotisa Hécate' :
               profile?.plan_type === 'isis' ? 'Sacerdotisa Ísis' :
               profile?.plan_type === 'lilith' ? 'Sacerdotisa Lilith' : 'Gratuito'}
            </p>
            <p className="text-[11px] text-netzach-muted mt-0.5">
              Status: <span className={profile?.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'}>
                {profile?.subscription_status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate('/assinar')}
            className="text-xs px-3 py-2 border border-netzach-gold/60 text-netzach-gold rounded-xl hover:bg-netzach-gold hover:text-netzach-bg transition-all"
          >
            Alterar
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-xl hover:bg-white transition-colors disabled:opacity-50 text-base"
        >
          {saved ? '✓ Dados salvos' : saving ? 'Salvando...' : 'Salvar alterações'}
        </button>

      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-netzach-gold uppercase tracking-wider">
        <span className="text-netzach-gold">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-netzach-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

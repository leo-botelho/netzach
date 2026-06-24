import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard, Lock, User, Loader2, QrCode, Copy,
  ShieldCheck, Smartphone, Mail, FileText, ArrowLeft, Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Planos conforme documento Netzach ────────────────────────────
const PLANS = [
  {
    id: 'hecate_mensal', sacerdotisa: 'hecate', label: 'Hécate',
    cycle: 'Mensal', price: 29.90, quota: '1 consulta/semana por módulo',
    symbol: '🌑', color: 'from-slate-800 to-purple-950',
  },
  {
    id: 'hecate_anual', sacerdotisa: 'hecate', label: 'Hécate',
    cycle: 'Anual', price: 249, quota: '1 consulta/semana por módulo',
    symbol: '🌑', color: 'from-slate-800 to-purple-950',
    save: 'Economize R$109',
  },
  {
    id: 'isis_mensal', sacerdotisa: 'isis', label: 'Ísis',
    cycle: 'Mensal', price: 44.90, quota: '3 consultas/semana por módulo',
    symbol: '☽', color: 'from-purple-900 to-indigo-950',
    popular: true,
  },
  {
    id: 'isis_anual', sacerdotisa: 'isis', label: 'Ísis',
    cycle: 'Anual', price: 389, quota: '3 consultas/semana por módulo',
    symbol: '☽', color: 'from-purple-900 to-indigo-950',
    save: 'Economize R$149', popular: true,
  },
  {
    id: 'lilith_mensal', sacerdotisa: 'lilith', label: 'Lilith',
    cycle: 'Mensal', price: 59.90, quota: 'Ilimitado em todos os módulos',
    symbol: '✦', color: 'from-rose-950 to-purple-950',
  },
  {
    id: 'lilith_anual', sacerdotisa: 'lilith', label: 'Lilith',
    cycle: 'Anual', price: 529, quota: 'Ilimitado em todos os módulos',
    symbol: '✦', color: 'from-rose-950 to-purple-950',
    save: 'Economize R$190',
  },
];

const FEATURES = [
  'Sacerdotisa com personalidade exclusiva',
  'Calendário lunar e rituais',
  'Check-in diário e hábitos sagrados',
  'Horóscopo solar, lunar e ascendente',
  'Banhos de ervas personalizados',
  'Diagnóstico de chakras',
  'Magia lunar por fase',
  'Tarô às cegas semanal',
  'Roda da vida e retrospectiva mensal',
];

function formatCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}
function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

type PayMethod = 'credit_card' | 'pix';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPlan = PLANS.find(p => p.id === searchParams.get('plano')) ?? PLANS[2];

  const [step, setStep] = useState<'plan' | 'form'>('plan');
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('credit_card');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code_base64: string; copy_paste: string } | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', cpf: '', phone: '',
    cardNumber: '', cardName: '', cardExpiry: '', cardCvc: '',
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.cpf || !form.phone) {
      return setError('Preencha todos os dados pessoais.');
    }
    if (form.cpf.replace(/\D/g, '').length < 11) {
      return setError('CPF inválido.');
    }
    if (paymentMethod === 'credit_card') {
      if (form.cardNumber.replace(/\s/g, '').length < 16) return setError('Número de cartão inválido.');
      if (form.cardExpiry.length < 5) return setError('Data de validade inválida.');
      if (form.cardCvc.length < 3) return setError('CVC inválido.');
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const [month, year] = form.cardExpiry.split('/');
      const body: Record<string, unknown> = {
        user_id: session?.user.id,
        plan_id: selectedPlan.id,
        payment_method: paymentMethod === 'credit_card' ? 'CREDIT_CARD' : 'PIX',
        amount: selectedPlan.price,
        customer: {
          name: form.name,
          email: form.email,
          cpfCnpj: form.cpf.replace(/\D/g, ''),
          phone: form.phone.replace(/\D/g, ''),
        },
      };

      if (paymentMethod === 'credit_card') {
        body.card = {
          holderName: form.cardName || form.name,
          number: form.cardNumber.replace(/\s/g, ''),
          expiryMonth: month,
          expiryYear: year?.length === 2 ? `20${year}` : year,
          ccv: form.cardCvc,
        };
      }

      const { data, error: fnError } = await supabase.functions.invoke('asaas-checkout', { body });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || 'Erro desconhecido');
      }

      if (paymentMethod === 'pix') {
        setPixData({ qr_code_base64: data.qr_code_base64, copy_paste: data.copy_paste });
      } else if (data.approved) {
        navigate('/templo?welcome=1');
      } else {
        setError('Pagamento não aprovado. Verifique os dados do cartão.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  // ── Tela PIX ───────────────────────────────────────────────────
  if (pixData) {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center p-4 font-sans text-netzach-text">
        <div className="bg-netzach-card border border-netzach-border p-8 rounded-2xl w-full max-w-sm text-center space-y-5">
          <div className="text-4xl">✦</div>
          <h2 className="text-xl font-mystic text-netzach-gold">PIX Gerado</h2>
          <p className="text-sm text-netzach-muted">
            Escaneie o QR Code ou copie o código PIX. Após o pagamento seu acesso é liberado automaticamente.
          </p>
          <div className="bg-white p-3 rounded-xl inline-block">
            <img src={pixData.qr_code_base64} alt="QR Code PIX" className="w-44 h-44" />
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(pixData.copy_paste); }}
            className="w-full bg-netzach-bg border border-netzach-border p-3 rounded-xl text-netzach-gold hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Copy size={15} /> Copiar código PIX
          </button>
          <button onClick={() => navigate('/templo')} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-xl font-bold">
            Já paguei, entrar no Templo
          </button>
          <button onClick={() => setPixData(null)} className="text-xs text-netzach-muted hover:text-white">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── Etapa 1: Escolha do plano ──────────────────────────────────
  if (step === 'plan') {
    return (
      <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-16">
        <header className="sticky top-0 z-10 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-mystic text-netzach-gold text-lg leading-none">Escolha sua Sacerdotisa</h1>
            <p className="text-[11px] text-netzach-muted mt-0.5">Todos os planos têm acesso a todas as funcionalidades</p>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">

          {/* Toggle mensal/anual */}
          <div className="flex gap-2 justify-center mb-2">
            {['mensal', 'anual'].map(cycle => (
              <button
                key={cycle}
                onClick={() => {
                  const equiv = PLANS.find(p =>
                    p.sacerdotisa === selectedPlan.sacerdotisa && p.id.endsWith(cycle)
                  );
                  if (equiv) setSelectedPlan(equiv);
                }}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                  selectedPlan.id.endsWith(cycle)
                    ? 'bg-netzach-gold text-netzach-bg border-netzach-gold'
                    : 'border-netzach-border text-netzach-muted hover:text-white'
                }`}
              >
                {cycle === 'mensal' ? 'Mensal' : 'Anual'}
                {cycle === 'anual' && <span className="ml-1.5 text-[10px] opacity-70">(-15%)</span>}
              </button>
            ))}
          </div>

          {PLANS.filter(p => p.id.endsWith(selectedPlan.id.endsWith('anual') ? 'anual' : 'mensal')).map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`w-full text-left rounded-2xl border p-5 transition-all ${
                selectedPlan.id === plan.id
                  ? 'border-netzach-gold bg-gradient-to-br ' + plan.color
                  : 'border-netzach-border bg-netzach-card hover:border-netzach-gold/50'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-2xl mr-2">{plan.symbol}</span>
                  <span className="font-mystic text-lg text-white">{plan.label}</span>
                  {plan.popular && (
                    <span className="ml-2 text-[10px] bg-netzach-gold text-netzach-bg px-2 py-0.5 rounded-full font-bold">POPULAR</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-netzach-gold">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-[11px] text-netzach-muted">/{plan.cycle.toLowerCase()}</p>
                  {plan.save && (
                    <p className="text-[11px] text-green-400 mt-0.5">{plan.save}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-netzach-muted">{plan.quota}</p>
              {selectedPlan.id === plan.id && (
                <div className="mt-3 pt-3 border-t border-netzach-border/50 space-y-1.5">
                  {FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-netzach-text/80">
                      <Check size={11} className="text-netzach-gold shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}

          <button
            onClick={() => setStep('form')}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors text-base mt-2"
          >
            Continuar com {selectedPlan.label} {selectedPlan.cycle} →
          </button>

          <p className="text-center text-[11px] text-netzach-muted">
            <ShieldCheck size={11} className="inline mr-1" />
            Pagamento seguro via Asaas. Cancele quando quiser.
          </p>
        </main>
      </div>
    );
  }

  // ── Etapa 2: Dados e pagamento ─────────────────────────────────
  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-16">
      <header className="sticky top-0 z-10 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => setStep('plan')} className="text-netzach-muted hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Finalizar assinatura</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">
            {selectedPlan.symbol} {selectedPlan.label} {selectedPlan.cycle}, R$ {selectedPlan.price.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handlePayment} className="space-y-5">

          {/* Dados pessoais */}
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold text-netzach-gold uppercase tracking-wider">Seus dados</h2>
            <div className="relative">
              <User size={15} className="absolute left-3 top-3.5 text-netzach-muted" />
              <input
                type="text" placeholder="Nome completo" value={form.name}
                onChange={e => set('name', e.target.value)}
                className="input-mystic pl-9" required
              />
            </div>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-3.5 text-netzach-muted" />
              <input
                type="email" placeholder="E-mail" value={form.email}
                onChange={e => set('email', e.target.value)}
                className="input-mystic pl-9" required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-3.5 text-netzach-muted" />
                <input
                  type="text" placeholder="CPF" value={form.cpf}
                  onChange={e => set('cpf', formatCPF(e.target.value))}
                  className="input-mystic pl-9" required
                />
              </div>
              <div className="relative">
                <Smartphone size={15} className="absolute left-3 top-3.5 text-netzach-muted" />
                <input
                  type="tel" placeholder="Celular" value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="input-mystic pl-9" required
                />
              </div>
            </div>
          </div>

          {/* Método de pagamento */}
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-netzach-gold uppercase tracking-wider">Pagamento</h2>
            <div className="flex gap-2">
              {(['credit_card', 'pix'] as PayMethod[]).map(m => (
                <button
                  key={m} type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all ${
                    paymentMethod === m
                      ? 'border-netzach-gold bg-netzach-gold/10 text-white'
                      : 'border-netzach-border text-netzach-muted hover:text-white'
                  }`}
                >
                  {m === 'credit_card' ? <><CreditCard size={15} /> Cartão</> : <><QrCode size={15} /> PIX</>}
                </button>
              ))}
            </div>

            {paymentMethod === 'credit_card' && (
              <div className="space-y-3">
                <div className="relative">
                  <CreditCard size={15} className="absolute left-3 top-3.5 text-netzach-muted" />
                  <input
                    type="text" placeholder="0000 0000 0000 0000" value={form.cardNumber}
                    onChange={e => set('cardNumber', formatCard(e.target.value))}
                    className="input-mystic pl-9 tracking-widest" required
                  />
                </div>
                <input
                  type="text" placeholder="NOME NO CARTÃO" value={form.cardName}
                  onChange={e => set('cardName', e.target.value.toUpperCase())}
                  className="input-mystic uppercase tracking-wider"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="MM/AA" value={form.cardExpiry}
                    onChange={e => set('cardExpiry', formatExpiry(e.target.value))}
                    className="input-mystic text-center tracking-widest" maxLength={5} required
                  />
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-3.5 text-netzach-muted" />
                    <input
                      type="password" placeholder="CVC" value={form.cardCvc}
                      onChange={e => set('cardCvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="input-mystic pl-9 text-center tracking-widest" maxLength={4} required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'pix' && (
              <div className="bg-netzach-bg border border-netzach-border rounded-xl p-4 text-center space-y-1">
                <QrCode size={32} className="mx-auto text-netzach-gold" />
                <p className="text-sm text-white">QR Code será gerado após confirmar</p>
                <p className="text-[11px] text-netzach-muted">Acesso liberado automaticamente após pagamento PIX</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base"
          >
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : <><ShieldCheck size={18} />
                {paymentMethod === 'pix'
                  ? `Gerar PIX, R$ ${selectedPlan.price.toFixed(2).replace('.', ',')}`
                  : `Pagar R$ ${selectedPlan.price.toFixed(2).replace('.', ',')}`
                }
              </>
            }
          </button>

          <p className="text-center text-[11px] text-netzach-muted">
            <ShieldCheck size={11} className="inline mr-1" />
            Ambiente seguro Asaas · Cancele quando quiser
          </p>
        </form>
      </main>
    </div>
  );
}

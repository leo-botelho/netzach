import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Calendar, User, Loader2, CheckCircle, QrCode, Copy, ShieldCheck, Smartphone, Mail, FileText, Globe } from 'lucide-react';
import cardValidator from 'card-validator';

const N8N_PAYMENT_URL = 'https://webhook.smartskillshub.com.br/webhook/checkout-netzach';

const PLANS = [
  { id: 'mensal', label: 'Mensal', price: 9.90 },
  { id: 'trimestral', label: 'Trimestral', price: 28.00, save: '-5%' },
  { id: 'semestral', label: 'Semestral', price: 52.00, save: '-12%' },
  { id: 'anual', label: 'Anual', price: 94.00, save: 'Melhor Valor', best: true },
];

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [pixData, setPixData] = useState<{ qr_code: string, copy_paste: string } | null>(null);

  // NOVO: Estado de País
  const [country, setCountry] = useState('BR'); // BR, PT, OTHER

  const [formData, setFormData] = useState({
    name: '', email: '', doc: '', phone: '',
    cardNumber: '', cardName: '', cardExpiry: '', cardCvc: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.doc || !formData.phone) {
        return alert("Por favor, preencha todos os dados pessoais.");
    }

    // Validação específica para Brasil
    if (country === 'BR' && formData.doc.length < 11) {
        return alert("CPF inválido.");
    }

    if (paymentMethod === 'credit_card') {
        const numberValidation = cardValidator.number(formData.cardNumber);
        if (!numberValidation.isValid) return alert("Número de cartão inválido.");
        if (formData.cardCvc.length < 3) return alert("CVC inválido.");
    }

    setLoading(true);

    try {
      // Define DDI baseado no país
      let ddi = '55';
      if (country === 'PT') ddi = '351';
      else if (country === 'OTHER') ddi = '1'; // Genérico

      const response = await fetch(N8N_PAYMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer: {
                name: formData.name,
                email: formData.email,
                document: formData.doc.replace(/\D/g, ''), // Remove pontos/traços
                document_type: country === 'BR' ? 'CPF' : 'PASSPORT', // Lógica de documento
                phone: formData.phone.replace(/\D/g, ''),
                country_code: ddi
            },
            payment: {
                method: paymentMethod,
                amount: Math.round(selectedPlan.price * 100),
                card: paymentMethod === 'credit_card' ? {
                    number: formData.cardNumber.replace(/\s/g, ''),
                    holder_name: formData.cardName,
                    expiration_date: formData.cardExpiry.replace('/', ''),
                    cvv: formData.cardCvc
                } : null
            },
            plan_id: selectedPlan.id
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
         if (paymentMethod === 'credit_card') {
             alert("Pagamento Aprovado! Redirecionando para sua iniciação...");
             navigate('/iniciacao'); 
         } else if (paymentMethod === 'pix' && result.pix) {
             setPixData({
                 qr_code: result.pix.qr_code_base64,
                 copy_paste: result.pix.copy_paste
             });
         }
      } else {
         alert("Pagamento não processado: " + (result.message || "Tente novamente."));
      }

    } catch (error) {
      console.error(error);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if(pixData?.copy_paste) {
        navigator.clipboard.writeText(pixData.copy_paste);
        alert("Código PIX copiado!");
    }
  };

  if (pixData) {
    return (
        <div className="min-h-screen bg-netzach-bg flex items-center justify-center p-4 font-sans text-netzach-text">
            <div className="bg-netzach-card border border-netzach-border p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
                <h2 className="text-xl font-mystic text-netzach-gold mb-4">Pagamento PIX Gerado</h2>
                <div className="bg-white p-4 rounded-xl inline-block mb-4 border-4 border-netzach-gold">
                    <img src={pixData.qr_code} alt="QR Code PIX" className="w-48 h-48"/> 
                </div>
                <button onClick={copyPix} className="w-full bg-[#0F0518] border border-netzach-border p-3 rounded-lg text-netzach-gold hover:bg-white/5 transition-colors flex items-center justify-center gap-2 mb-6">
                    <Copy size={16}/> Copiar Código PIX
                </button>
                <button onClick={() => navigate('/iniciacao')} className="w-full bg-netzach-gold text-netzach-bg py-3 rounded-lg font-bold">Já fiz o pagamento</button>
                <button onClick={() => setPixData(null)} className="mt-4 text-xs text-netzach-muted hover:text-white">Voltar</button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-netzach-bg flex items-center justify-center p-4 font-sans text-netzach-text pb-24">
      <div className="bg-netzach-card border border-netzach-border p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-2xl">
        
        <div className="text-center mb-8">
            <h1 className="text-2xl font-mystic text-netzach-gold mb-2">Junte-se ao Templo</h1>
            <p className="text-sm text-netzach-muted">Escolha o ciclo ideal para sua jornada.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-netzach-gold uppercase mb-2">1. Escolha o Plano</h3>
                {PLANS.map(plan => (
                    <button key={plan.id} onClick={() => setSelectedPlan(plan)} className={`w-full p-3 rounded-xl border transition-all flex justify-between items-center ${selectedPlan.id === plan.id ? 'bg-netzach-gold text-netzach-bg border-netzach-gold font-bold shadow-lg' : 'bg-[#0F0518] border-netzach-border text-netzach-muted hover:border-netzach-gold/50'}`}>
                        <span className="text-sm uppercase tracking-wide">{plan.label}</span>
                        <div className="text-right"><span className="block text-lg">R$ {plan.price.toFixed(2).replace('.', ',')}</span>{plan.save && <span className="text-[10px] opacity-80 block">{plan.save}</span>}</div>
                    </button>
                ))}
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
                <h3 className="text-xs font-bold text-netzach-gold uppercase mb-2">2. Seus Dados</h3>
                
                {/* SELETOR DE PAÍS */}
                <div className="relative">
                    <Globe className="absolute left-3 top-3 text-netzach-muted" size={16}/>
                    <select 
                        className="w-full pl-9 p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg outline-none focus:border-netzach-gold text-white text-sm"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    >
                        <option value="BR">🇧🇷 Brasil</option>
                        <option value="PT">🇵🇹 Portugal</option>
                        <option value="OTHER">🌍 Outro</option>
                    </select>
                </div>

                <div className="relative">
                    <User className="absolute left-3 top-3 text-netzach-muted" size={16}/>
                    <input name="name" placeholder="Nome Completo" className="w-full pl-9 p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg outline-none focus:border-netzach-gold text-white text-sm" value={formData.name} onChange={handleInputChange} required />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 text-netzach-muted" size={16}/>
                        <input 
                            name="doc" 
                            placeholder={country === 'BR' ? "CPF (Só números)" : "NIF / Passaporte"} 
                            className="w-full pl-9 p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg outline-none focus:border-netzach-gold text-white text-sm" 
                            value={formData.doc} 
                            onChange={handleInputChange} 
                            required 
                        />
                    </div>
                    <div className="relative">
                        <Smartphone className="absolute left-3 top-3 text-netzach-muted" size={16}/>
                        <input name="phone" placeholder={country === 'PT' ? "Telemóvel" : "Celular"} className="w-full pl-9 p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg outline-none focus:border-netzach-gold text-white text-sm" value={formData.phone} onChange={handleInputChange} required />
                    </div>
                </div>

                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-netzach-muted" size={16}/>
                    <input name="email" type="email" placeholder="Seu E-mail" className="w-full pl-9 p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg outline-none focus:border-netzach-gold text-white text-sm" value={formData.email} onChange={handleInputChange} required />
                </div>

                <h3 className="text-xs font-bold text-netzach-gold uppercase mb-2 mt-6">3. Pagamento</h3>
                
                <div className="flex bg-[#0F0518] p-1 rounded-lg mb-4 border border-netzach-border">
                    <button type="button" onClick={() => setPaymentMethod('credit_card')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${paymentMethod === 'credit_card' ? 'bg-netzach-card text-netzach-gold shadow' : 'text-netzach-muted hover:text-white'}`}><CreditCard size={14}/> Cartão</button>
                    {country === 'BR' && ( // PIX SÓ PARA BRASIL
                        <button type="button" onClick={() => setPaymentMethod('pix')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${paymentMethod === 'pix' ? 'bg-netzach-card text-netzach-gold shadow' : 'text-netzach-muted hover:text-white'}`}><QrCode size={14}/> PIX</button>
                    )}
                </div>

                {paymentMethod === 'credit_card' && (
                    <div className="space-y-3 animate-in fade-in">
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-3 text-netzach-muted" size={16}/>
                            <input name="cardNumber" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full pl-9 p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-white text-sm" value={formData.cardNumber} onChange={handleInputChange} required />
                        </div>
                        <input name="cardName" placeholder="NOME NO CARTÃO" className="w-full p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-white text-sm uppercase" value={formData.cardName} onChange={handleInputChange} required />
                        <div className="grid grid-cols-2 gap-3">
                            <input name="cardExpiry" placeholder="MM/AA" maxLength={5} className="w-full p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-white text-sm" value={formData.cardExpiry} onChange={handleInputChange} required />
                            <div className="relative"><Lock className="absolute left-3 top-3 text-netzach-muted" size={16} /><input name="cardCvc" type="password" placeholder="123" maxLength={4} className="w-full pl-9 p-2.5 bg-[#0F0518] border border-netzach-border rounded-lg focus:border-netzach-gold outline-none text-white text-sm" value={formData.cardCvc} onChange={handleInputChange} required /></div>
                        </div>
                    </div>
                )}

                <button disabled={loading} className="w-full bg-netzach-gold text-netzach-bg py-4 rounded-xl font-bold hover:bg-white transition-all shadow-lg mt-4 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin"/> : <><ShieldCheck size={18}/> Pagar R$ {selectedPlan.price.toFixed(2).replace('.', ',')}</>}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}
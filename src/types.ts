// --- PERFIL DA ALUNA ---
export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  whatsapp?: string;
  role: 'student' | 'admin';
  
  // Astrologia
  birth_date?: string;
  birth_time?: string;
  sign_sun?: string;
  sign_moon?: string;
  sign_rising?: string;

  // Ciclo Menstrual
  last_period_date?: string;
  cycle_duration?: number;
  period_duration?: number;
  
  // Integração WhatsApp
  whatsapp_status?: string;
  whatsapp_instance_name?: string;
  whatsapp_instance_id?: string;
  whatsapp_token?: string;
}

// --- VENDAS (E-commerce) ---
export interface ServiceCatalog {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url?: string;
  payment_url?: string; // Link para Kiwify/Stripe/N8N
  active?: boolean;
  created_at?: string;
}

// --- CONTEÚDO ---
export interface Ritual {
  id: string;
  title: string;
  description: string;
  materials: string; // Ingredientes
  category: string;
  moon_phase?: string;
  image_url?: string;
  created_at?: string;
}

export interface Horoscope {
  id: string;
  sign: string; // 'aries', 'touro'... ou 'ceu_semana'
  type: string; // 'weekly_prediction', etc.
  content: string;
  valid_date: string;
}

export interface DailyInsight {
  id: string;
  date: string;
  moon_phase: string;
  astrological_highlight?: string;
  recommended_bath?: string;
  tarot_card_id?: string; // Nome do Arcano
  card_image_url?: string; // NOVO
  card_meaning?: string;   // NOVO
}

// --- SOLICITAÇÕES ---
export interface ServiceRequest {
  id: string;
  user_id: string;
  service_type: string;
  status: 'pending' | 'completed' | 'paid';
  user_notes: string;
  admin_response?: string;
  created_at: string;
  profiles?: Profile; // Join com a tabela de perfil
}

// --- AGENDAMENTO (Legado/Opcional se ainda usar o calendário antigo) ---
export interface Appointment {
  id: string;
  service_id: string;
  profile_id: string;
  cliente_nome: string;
  cliente_email: string;
  data_inicio: string;
  data_fim: string;
}

export interface Service {
  id: string;
  profile_id: string;
  titulo: string;
  duracao_minutos: number;
  preco: number;
}
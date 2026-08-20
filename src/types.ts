// ==========================================
// 1. PERFIL E DADOS BÁSICOS
// ==========================================
export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  whatsapp?: string;
  role: 'student' | 'admin';
  subscription_status?: string; // Ativo/Inativo
  plan_type?: string;
  subscription_end_date?: string;
  last_payment_method?: string;
  
  // Astrologia e Dados Pessoais
  birth_date?: string;
  birth_time?: string;
  birth_city?: string;
  sign_sun?: string;
  sign_moon?: string;
  sign_rising?: string;

  // Ciclo Menstrual
  last_period_date?: string;
  cycle_duration?: number;
  period_duration?: number;

  // Perfil sagrado expandido
  weight?: number;
  height?: number;
  main_intention?: string;
  
  // Integração WhatsApp
  whatsapp_status?: string;
  whatsapp_instance_name?: string;
  whatsapp_instance_id?: string;
  whatsapp_token?: string;

  // Campo legado do sistema antigo, mantido só para não quebrar
  // referências antigas. Formato desconhecido de propósito.
  expediente?: unknown;
  asaas_customer_id?: string | null;
}

// ==========================================
// 2. CONTEÚDO E SERVIÇOS (NETZACH)
// ==========================================
export interface ServiceCatalog {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url?: string;
  payment_url?: string;
  active?: boolean;
  created_at?: string;
}

export interface Ritual {
  id: string;
  title: string;
  description: string;
  materials: string; 
  category: string;
  moon_phase?: string;
  image_url?: string;
  created_at?: string;
}

export interface Horoscope {
  id: string;
  sign: string; 
  type: string;
  content: string;
  valid_date: string;
}

export interface DailyInsight {
  id: string;
  date: string;
  moon_phase: string;
  astrological_highlight?: string;
  recommended_bath?: string;
  tarot_card_id?: string;
  card_image_url?: string;
  card_meaning?: string;
}

export interface ServiceRequest {
  id: string;
  user_id: string;
  service_type: string;
  status: 'pending' | 'completed' | 'paid';
  user_notes: string;
  admin_response?: string;
  created_at: string;
  profiles?: Profile;
}

// ==========================================
// 3. MATRIZ DO DESTINO (GEOMETRIA SAGRADA)
// ==========================================

export interface MatrizCircle {
  value: number;
  arcano: number;
}

export interface MatrizSequence {
  maior: MatrizCircle;
  intermediario: MatrizCircle;
  menor: MatrizCircle;
}

export interface MatrizDiagonal {
  maior: MatrizCircle;
  meio: MatrizCircle;
  menor: MatrizCircle;
}

export interface MatrizChakra {
  fisico: number;
  energia: number;
  emocoes: number;
}

export interface MatrizPurpose {
  ceu?: number;
  terra?: number;
  masculino?: number;
  feminino?: number;
  final: number;
}

export interface MatrizDestino {
  birthDate: string;
  
  central: {
    maior: MatrizCircle;
    medio: MatrizCircle;
    menor: MatrizCircle;
  };
  
  base: MatrizSequence;
  topo: MatrizSequence;
  lateralDireita: MatrizSequence;
  lateralEsquerda: MatrizSequence;
  
  circuloVerdeCentralTopo: MatrizCircle;
  circuloVerdeCentralEsquerda: MatrizCircle;
  
  diagonalSuperiorEsquerda: MatrizDiagonal;
  diagonalSuperiorDireita: MatrizDiagonal;
  diagonalInferiorEsquerda: MatrizDiagonal;
  diagonalInferiorDireita: MatrizDiagonal;
  
  linhaPontilhada: {
    menorBase: MatrizCircle;
    primeiroEsquerda: MatrizCircle;
    meio: MatrizCircle;
    primeiroDireita: MatrizCircle;
    menorDireita: MatrizCircle;
  };
  
  chakras: {
    sahashara: MatrizChakra;
    ajna: MatrizChakra;
    vishuddha: MatrizChakra;
    anahata: MatrizChakra;
    manipura: MatrizChakra;
    svadhishthana: MatrizChakra;
    muladhara: MatrizChakra;
  };
  
  resumoSaude: {
    fisico: number;
    energetico: number;
    emocional: number;
  };
  
  propositos: {
    pessoal: MatrizPurpose;
    social: MatrizPurpose;
    espiritual: number;
    global: number;
  };
}

// ==========================================
// 4. LEGADO / UTILITÁRIOS
// ==========================================

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

export interface Client {
  id: string;
  profile_id: string;
  nome: string;
  email: string;
  telefone: string;
}

// ==========================================
// 5. CHECK-IN E HÁBITOS
// ==========================================

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  period: 'morning' | 'evening';
  // Manhã
  energy?: number;
  emotion?: number;
  mind?: number;
  sleep_quality?: number;
  dream_notes?: string;
  intention?: string;
  // Noite
  alignment?: string;
  gratitude?: string;
  mood?: number;
  release_notes?: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  date: string;
  habit: 'caminhada' | 'hidratacao' | 'cha_almoco' | 'cha_noite' | 'leitura' | 'silencio';
  created_at: string;
}

export interface Gratitude {
  id: string;
  user_id: string;
  date: string;
  content: string;
  created_at: string;
}

// Constante de Nomes dos Arcanos
export const ARCANOS: { [key: number]: string } = {
  0: "O Louco", 1: "O Mago", 2: "A Sacerdotisa", 3: "A Imperatriz", 4: "O Imperador",
  5: "O Hierofante", 6: "Os Enamorados", 7: "O Carro", 8: "A Justiça", 9: "O Eremita",
  10: "A Roda da Fortuna", 11: "A Força", 12: "O Enforcado", 13: "A Morte", 14: "A Temperança",
  15: "O Diabo", 16: "A Torre", 17: "A Estrela", 18: "A Lua", 19: "O Sol",
  20: "O Julgamento", 21: "O Mundo", 22: "O Louco"
};

// ==========================================
// 5. TABELAS SEM TIPO GERADO
//
// Enquanto `supabase gen types` não puder rodar (exige o projeto
// ligado à CLI), estes tipos são escritos à mão a partir das
// migrations e do uso real no código. Antes tudo isso era `any`.
// ==========================================

/** Plano vendido na tela de assinatura. Ver migration 20260624_plan_configs. */
export interface PlanConfig {
  id: string;                       // 'hecate_mensal', 'isis_anual', ...
  plan_type: 'hecate' | 'isis' | 'lilith';
  name: string;
  cycle: 'mensal' | 'anual';
  price: number;
  symbol?: string;
  features?: string;
  active: boolean;
  updated_at?: string;
}

/** Trecho da base de conhecimento da sacerdotisa. */
export interface KnowledgeChunk {
  id: string;
  category: string;
  title: string;
  /** Ausente na listagem do painel, que seleciona só os metadados. */
  content?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

/** Intenção guardada na Mandala do Mês. */
export interface MandalaIntention {
  id?: string;
  user_id: string;
  month: string;
  intention: string;
  created_at?: string;
}

/** Fase lunar calculada em utils/mysticMath. */
export interface MoonPhase {
  dayOfCycle: number;
  phase: 'Nova' | 'Crescente' | 'Cheia' | 'Minguante';
  label: string;
}

/** Situação do ciclo menstrual calculada em utils/mysticMath. */
export interface CycleStatus {
  phaseName: string;
  dayOfCycle: number;
  nextPeriodDate: string;
  statusText: string;
  isLate: boolean;
}

/**
 * Muitas telas fazem `select` de poucas colunas do perfil. Este apelido
 * evita fingir que o objeto é um Profile inteiro.
 */
export type PerfilParcial = Partial<Profile>;

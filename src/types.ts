export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  nicho: string;
  expediente: Record<string, { inicio: string; fim: string }[]> | null;
  whatsapp_instance_name?: string;
  whatsapp_status?: string;
  whatsapp_token?: string;
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
  notas?: string;
}

export interface Appointment {
  id: string;
  service_id: string;
  profile_id: string;
  client_id?: string; // Novo campo
  cliente_nome: string; // Mantemos como backup/cache
  cliente_email: string;
  cliente_telefone?: string;
  data_inicio: string;
  data_fim: string;
  status?: string;
  service?: Service;
}
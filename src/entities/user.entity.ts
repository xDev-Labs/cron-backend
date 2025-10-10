export interface User {
  user_id: string; // UUID, Primary Key
  phone_number: string; // Unique, Not Null
  cron_id: string; // Unique, Not Null
  primary_address: string; // Unique, Not Null
  wallet_address: string[]; // Unique, Not Null
  avatar_url?: string;
  preferred_currency: string; // Not Null, Default: 'USD'
  local_currency: string; // Not Null, Default: 'USD'
  face_id_enabled: boolean; // BOOLEAN, Not Null, Default: false
  created_at: string; // TIMESTAMP, Not Null, Default: CURRENT_TIMESTAMP
  updated_at?: string; // TIMESTAMP
}

export interface CreateUserDto {
  phone_number: string;
  cron_id: string;
  primary_address: string;
  wallet_address: string[];
  avatar_url?: string;
  preferred_currency?: string;
  local_currency?: string;
  face_id_enabled?: boolean;
}

export interface UpdateUserDto {
  phone_number?: string;
  cron_id?: string;
  primary_address?: string;
  wallet_address?: string[];
  avatar_url?: string;
  preferred_currency?: string;
  local_currency?: string;
  face_id_enabled?: boolean;
}

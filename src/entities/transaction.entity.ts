export interface TxToken {
  amount: string;
  token_address: string;
}

export type TxStatus = 'pending' | 'completed' | 'failed';

export interface Transaction {
  transaction_hash: string; // TEXT, Primary Key
  sender_uid: string; // UUID, Foreign Key (Users.user_id), Not Null
  receiver_uid: string; // UUID, Foreign Key (Users.user_id), Not Null
  amount: number; // Not Null
  token: TxToken[]; // Not Null
  chain_id: number; // Not Null
  status: TxStatus; // ENUM, Not Null, Default: 'pending'
  created_at: string; // TIMESTAMP, Not Null, Default: CURRENT_TIMESTAMP
  completed_at?: string; // TIMESTAMP
  receiver?: {
    phone_number: string;
  };
}

export interface CreateTransactionDto {
  transaction_hash: string;
  sender_uid: string;
  receiver_uid: string;
  amount: number;
  token: TxToken[];
  chain_id: number;
  status?: TxStatus;
}

export interface UpdateTransactionDto {
  sender_uid?: string;
  receiver_uid?: string;
  amount?: number;
  token?: TxToken[];
  chain_id?: number;
  status?: TxStatus;
  completed_at?: string;
}

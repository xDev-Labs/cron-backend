import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { Transaction } from '../../entities/transaction.entity';

@Injectable()
export class TransactionService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getTransactionByHash(
    transactionHash: string,
  ): Promise<Transaction | null> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_hash', transactionHash)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get transaction: ${error.message}`);
    }

    return data;
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_uid.eq.${userId},receiver_uid.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get transactions for user: ${error.message}`);
    }

    return data || [];
  }
}

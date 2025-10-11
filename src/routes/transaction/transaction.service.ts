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

  async getTransactionsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const supabase = this.supabaseService.getClient();

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`sender_uid.eq.${userId},receiver_uid.eq.${userId}`);

    if (countError) {
      throw new Error(`Failed to get transaction count: ${countError.message}`);
    }

    // Get paginated transactions
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_uid.eq.${userId},receiver_uid.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get transactions for user: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      transactions: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

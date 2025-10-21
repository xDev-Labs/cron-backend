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
      .select(
        `
        *,
        receiver:receiver_uid(phone_number)
      `,
      )
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
    receiver?: string,
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

    // Build base query with user filter
    let userFilter = `sender_uid.eq.${userId},receiver_uid.eq.${userId}`;
    let ascending = false;
    // Resolve receiver identifier to user ID if provided
    let receiverUserId: string | null = null;
    if (receiver) {
      ascending = true;
      receiverUserId = await this.resolveReceiverIdentifier(receiver);
      if (!receiverUserId) {
        // Return empty data if receiver not found
        return {
          transactions: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      userFilter = `sender_uid.eq.${userId},receiver_uid.eq.${userId},receiver_uid.eq.${receiverUserId}`;
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(userFilter);

    if (countError) {
      throw new Error(`Failed to get transaction count: ${countError.message}`);
    }

    // Get paginated transactions with receiver phone number
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
        *,
        receiver:receiver_uid(phone_number)
      `,
      )
      .or(userFilter)
      .order('created_at', { ascending: ascending })
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

  async createTransaction(transactionData: {
    transaction_hash: string;
    sender_uid: string;
    receiver_uid: string;
    amount: number;
    token: Array<{ amount: string; token_address: string }>;
    chain_id: number;
    status?: 'pending' | 'completed' | 'failed';
  }): Promise<{
    success: boolean;
    message: string;
    transaction?: Transaction;
  }> {
    const supabase = this.supabaseService.getClient();

    // Validate that both sender and receiver exist
    const { data: senderExists, error: senderError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', transactionData.sender_uid)
      .single();

    if (senderError || !senderExists) {
      return {
        success: false,
        message: 'Sender user not found',
      };
    }

    const { data: receiverExists, error: receiverError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', transactionData.receiver_uid)
      .single();

    if (receiverError || !receiverExists) {
      return {
        success: false,
        message: 'Receiver user not found',
      };
    }

    // Check if transaction hash already exists
    const { data: existingTransaction, error: hashError } = await supabase
      .from('transactions')
      .select('transaction_hash')
      .eq('transaction_hash', transactionData.transaction_hash)
      .single();

    if (hashError && hashError.code !== 'PGRST116') {
      throw new Error(
        `Failed to check existing transaction: ${hashError.message}`,
      );
    }

    if (existingTransaction) {
      return {
        success: false,
        message: 'Transaction with this hash already exists',
      };
    }

    // Create the transaction
    const { data: newTransaction, error: createError } = await supabase
      .from('transactions')
      .insert({
        transaction_hash: transactionData.transaction_hash,
        sender_uid: transactionData.sender_uid,
        receiver_uid: transactionData.receiver_uid,
        amount: transactionData.amount,
        token: transactionData.token,
        chain_id: transactionData.chain_id,
        status: transactionData.status || 'pending',
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create transaction: ${createError.message}`);
    }

    return {
      success: true,
      message: 'Transaction created successfully',
      transaction: newTransaction,
    };
  }

  private async resolveReceiverIdentifier(
    identifier: string,
  ): Promise<string | null> {
    const supabase = this.supabaseService.getClient();

    // Check if it's already a UUID (user_id)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      // It's a UUID, check if user exists
      const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', identifier)
        .single();

      if (error || !data) {
        return null;
      }
      return data.user_id;
    }

    // Check if it's a phone number
    if (identifier.startsWith('+') || /^\d+$/.test(identifier)) {
      const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('phone_number', identifier)
        .single();

      if (error || !data) {
        return null;
      }
      return data.user_id;
    }

    // Check if it's a cron_id
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .eq('cron_id', identifier)
      .single();

    if (error || !data) {
      return null;
    }
    return data.user_id;
  }
}

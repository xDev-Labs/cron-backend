import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { Transaction } from '../../entities/transaction.entity';

@Injectable()
export class TransactionService {
  constructor(private readonly supabaseService: SupabaseService) { }

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

    // Fetch receiver's phone number separately
    if (data && data.receiver_addr) {
      const { data: receiverData, error: receiverError } = await supabase
        .from('users')
        .select('phone_number')
        .eq('user_id', data.receiver_addr)
        .single();

      if (!receiverError && receiverData) {
        data.receiver = receiverData;
      }
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
    let userFilter = `sender_addr.eq.${userId},receiver_addr.eq.${userId}`;
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
      // Filter for transactions between the two users (both directions)
      userFilter = `and(sender_addr.eq.${userId},receiver_addr.eq.${receiverUserId}),and(sender_addr.eq.${receiverUserId},receiver_addr.eq.${userId})`;
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(userFilter);

    if (countError) {
      throw new Error(`Failed to get transaction count: ${countError.message}`);
    }

    // Get paginated transactions without join
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(userFilter)
      .order('created_at', { ascending: ascending })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get transactions for user: ${error.message}`);
    }

    // Fetch phone numbers for all unique receiver addresses
    if (data && data.length > 0) {
      const uniqueReceiverAddrs = [...new Set(data.map(tx => tx.receiver_addr))];

      const { data: receiversData, error: receiversError } = await supabase
        .from('users')
        .select('user_id, phone_number')
        .in('user_id', uniqueReceiverAddrs);

      if (!receiversError && receiversData) {
        // Create a map for quick lookup
        const receiverMap = new Map(
          receiversData.map(user => [user.user_id, { phone_number: user.phone_number }])
        );

        // Add receiver data to each transaction
        data.forEach(transaction => {
          const receiverInfo = receiverMap.get(transaction.receiver_addr);
          if (receiverInfo) {
            transaction.receiver = receiverInfo;
          }
        });
      }
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
    sender_addr: string;
    receiver_addr: string;
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
      .eq('primary_address', transactionData.sender_addr)
      .single();


    const { data: receiverExists, error: receiverError } = await supabase
      .from('users')
      .select('user_id')
      .eq('primary_address', transactionData.receiver_addr)
      .single();

    if (!senderExists || !receiverExists) {
      return {
        success: false,
        message: 'Sender or receiver not found',
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
        sender_addr: transactionData.sender_addr,
        receiver_addr: transactionData.receiver_addr,
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

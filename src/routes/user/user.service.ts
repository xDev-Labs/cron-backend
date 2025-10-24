import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { User } from '../../entities/user.entity';
import { Encoding, SolanaService } from 'src/solana/solana.service';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

@Injectable()
export class UsersService {
  private readonly feePayer: Keypair;

  constructor(private readonly supabaseService: SupabaseService, private readonly solanaService: SolanaService) {
    this.feePayer = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SERVER_WALLET_PRIVATE_KEY!));
  }

  async getUserById(userId: string): Promise<User | null> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<{
    user_id: string;
    phone_number: string;
    cron_id: string;
    primary_address: string;
    avatar_url?: string;
  } | null> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('users')
      .select('user_id, phone_number, cron_id, primary_address, avatar_url')
      .eq('phone_number', phoneNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      throw new Error(`Failed to get user by phone number: ${error.message}`);
    }

    return data;
  }

  async checkCronIdAvailability(
    cronId: string,
  ): Promise<{ available: boolean; message: string }> {
    // Check if cron ID is at least 3 characters
    if (cronId.length < 3) {
      return {
        available: false,
        message: 'Cron ID must be at least 3 characters long',
      };
    }

    const supabase = this.supabaseService.getClient();

    // Check if cron ID already exists
    const { data, error } = await supabase
      .from('users')
      .select('cron_id')
      .eq('cron_id', cronId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No user found with this cron ID, so it's available
        return {
          available: true,
          message: 'Cron ID is available',
        };
      }
      throw new Error(`Failed to check cron ID availability: ${error.message}`);
    }

    // User found with this cron ID, so it's not available
    return {
      available: false,
      message: 'Cron ID is already taken',
    };
  }

  async registerCronId(
    userId: string,
    cronId: string,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    // First, check if cron ID is still available
    const availabilityCheck = await this.checkCronIdAvailability(cronId);

    if (!availabilityCheck.available) {
      return {
        success: false,
        message: availabilityCheck.message,
      };
    }

    const supabase = this.supabaseService.getClient();

    // Update user's cron ID
    const { data, error } = await supabase
      .from('users')
      .update({ cron_id: cronId })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register cron ID: ${error.message}`);
    }

    return {
      success: true,
      message: 'Cron ID registered successfully',
      user: data,
    };
  }

  async createUser(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    user?: User;
    isNewUser: boolean;
  }> {
    const supabase = this.supabaseService.getClient();
    // First, check if user already exists with this phone number
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing user: ${findError.message}`);
    }

    // If user exists, return the existing user
    if (existingUser) {
      return {
        success: true,
        message: 'User found with existing phone number',
        user: existingUser,
        isNewUser: false,
      };
    }

    // Generate a new UUID for the user using crypto.randomUUID()
    const userId = crypto.randomUUID();



    // // Create new user with minimal required fields
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        cron_id: null, // Will be set during onboarding
        primary_address: null, // Will be set during onboarding
        wallet_address: [], // Empty array is allowed
        preferred_currency: 'USD',
        local_currency: 'USD',
        face_id_enabled: false,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    return {
      success: true,
      message: 'New user created successfully',
      user: newUser,
      isNewUser: true,
    };
  }

  async updateUser(
    userId: string,
    updateData: Partial<User>,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    const supabase = this.supabaseService.getClient();
    // Remove user_id and timestamps from update data to prevent modification
    const { user_id, created_at, updated_at, ...allowedUpdateData } =
      updateData;

    // Add updated_at timestamp
    const dataToUpdate = {
      ...allowedUpdateData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .update(dataToUpdate)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          message: 'User not found',
        };
      }
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return {
      success: true,
      message: 'User updated successfully',
      user: data,
    };
  }

  async onboardUser(
    userId: string,
    walletAddress: string,
    smartWalletAddress: string,
    encodedTransaction: string,
    avatarUrl: string,
    username: string
  ): Promise<{ success: boolean; message: string; user?: User; signature?: string }> {
    console.log('\n=== ONBOARD USER DEBUG ===');
    console.log('User ID:', userId);
    console.log('Wallet Address:', walletAddress);
    console.log('Smart Wallet Address:', smartWalletAddress);
    console.log('Username:', username);
    console.log('Avatar URL:', avatarUrl);
    console.log('Transaction length:', encodedTransaction.length);

    // 1. Check username availability
    const availabilityCheck = await this.checkCronIdAvailability(username);
    if (!availabilityCheck.available) {
      return {
        success: false,
        message: availabilityCheck.message,
      };
    }

    // 2. Sign and send transaction
    console.log('\n--- Signing and sending transaction ---');
    console.log('Server fee payer:', this.feePayer.publicKey.toBase58());

    const signature = await this.solanaService.signAndSendTransaction(
      encodedTransaction,
      Encoding.BASE64,
      this.feePayer
    );

    console.log('\nTransaction signature:', signature);


    // 3. Update user with onboarding data
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('users')
      .update({
        primary_address: smartWalletAddress,
        wallet_address: [smartWalletAddress],
        cron_id: username,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          message: 'User not found',
        };
      }
      throw new Error(`Failed to onboard user: ${error.message}`);
    }

    console.log('User onboarded successfully:', data);
    console.log('=== END ONBOARD USER DEBUG ===\n');

    return {
      success: true,
      message: 'User onboarded successfully',
      user: data,
      signature,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

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

    // Generate a new UUID for the user
    const { data: uuidData, error: uuidError } =
      await supabase.rpc('gen_random_uuid');
    if (uuidError) {
      throw new Error(`Failed to generate UUID: ${uuidError.message}`);
    }

    const userId = uuidData;

    // Create new user with minimal required fields
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        cron_id: '', // Will be set during onboarding
        primary_address: '', // Will be set during onboarding
        wallet_address: [], // Will be set during onboarding
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
}

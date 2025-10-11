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
}

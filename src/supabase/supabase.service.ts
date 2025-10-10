import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !anonKey) {
      throw new Error(
        'Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY\n' +
          'Please create a .env file with these variables.',
      );
    }

    this.supabase = createClient(url, anonKey);
    console.log('✅ Supabase connected successfully!');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}

import { Module } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [SolanaService],
  exports: [SolanaService],
})
export class SolanaModule { }
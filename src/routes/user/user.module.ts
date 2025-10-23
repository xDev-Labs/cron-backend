import { Module } from '@nestjs/common';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { SupabaseModule } from '../../supabase/supabase.module';
import { SolanaModule } from '../../solana/solana.module';

@Module({
  imports: [SupabaseModule, SolanaModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule { }

import { Module } from '@nestjs/common';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { SupabaseModule } from '../../supabase/supabase.module';
import { SolanaModule } from '../../solana/solana.module';
import { TransactionModule } from '../transaction/transaction.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [SupabaseModule, SolanaModule, TransactionModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule { }

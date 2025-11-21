import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FirebaseAdminService } from './firebase-admin.service';
import { JwtAuthService } from './jwt-auth.service';
import { JwtAccessGuard } from './guards/jwt-access.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [FirebaseAdminService, JwtAuthService, JwtAccessGuard],
  exports: [FirebaseAdminService, JwtAuthService, JwtAccessGuard],
})
export class AuthModule {}

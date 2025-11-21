import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthService, AccessTokenPayload } from '../jwt-auth.service';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly jwtAuthService: JwtAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const payload = await this.jwtAuthService.verifyAccessToken(token);
    request.user = payload;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}

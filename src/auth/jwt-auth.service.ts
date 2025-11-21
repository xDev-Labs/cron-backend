import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';

export interface JwtUser {
  userId: string;
  phoneNumber: string;
  cronId?: string | null;
}

export interface JwtTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: {
    accessToken: StringValue | number;
    refreshToken: StringValue | number;
  };
  refreshTokenId: string;
}

export interface AccessTokenPayload {
  sub: string;
  phone: string;
  cronId?: string | null;
  jti: string;
  refreshJti: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  phone: string;
  cronId?: string | null;
  jti: string;
  type: 'refresh';
}

@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokenPair(user: JwtUser): Promise<JwtTokenPair> {
    const refreshJti = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      ...this.buildBaseClaims(user),
      jti: refreshJti,
      type: 'refresh',
    };

    const accessPayload: AccessTokenPayload = {
      ...this.buildBaseClaims(user),
      jti: randomUUID(),
      refreshJti,
      type: 'access',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiresIn(),
        issuer: this.getIssuer(),
        audience: this.getAudience(),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn(),
        issuer: this.getIssuer(),
        audience: this.getAudience(),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      refreshTokenId: refreshJti,
      expiresIn: {
        accessToken: this.getAccessExpiresIn(),
        refreshToken: this.getRefreshExpiresIn(),
      },
    };
  }

  async rotateTokens(
    refreshToken: string,
    userOverride?: JwtUser,
  ): Promise<JwtTokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user: JwtUser = userOverride ?? {
      userId: payload.sub,
      phoneNumber: payload.phone,
      cronId: payload.cronId,
    };

    return this.generateTokenPair(user);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.getAccessSecret(),
        issuer: this.getIssuer(),
        audience: this.getAudience(),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid access token');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.getRefreshSecret(),
        issuer: this.getIssuer(),
        audience: this.getAudience(),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private buildBaseClaims(user: JwtUser) {
    return {
      sub: user.userId,
      phone: user.phoneNumber,
      cronId: user.cronId ?? null,
    };
  }

  private getAccessSecret(): string {
    const secret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_TOKEN_SECRET is not configured');
    }
    return secret;
  }

  private getRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_TOKEN_SECRET is not configured');
    }
    return secret;
  }

  private getAccessExpiresIn(): StringValue | number {
    const value = this.configService.get<string | number>(
      'JWT_ACCESS_TOKEN_EXPIRES_IN',
    );
    return (value ?? '15m') as StringValue | number;
  }

  private getRefreshExpiresIn(): StringValue | number {
    const value = this.configService.get<string | number>(
      'JWT_REFRESH_TOKEN_EXPIRES_IN',
    );
    return (value ?? '7d') as StringValue | number;
  }

  private getIssuer(): string | undefined {
    return this.configService.get<string>('JWT_TOKEN_ISSUER');
  }

  private getAudience(): string | undefined {
    return this.configService.get<string>('JWT_TOKEN_AUDIENCE');
  }
}

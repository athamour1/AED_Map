import { randomBytes, createHash } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './strategies/jwt.strategy';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_TTL = '15m';

export interface RefreshCookieMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    email: string,
    password: string,
    meta: RefreshCookieMeta,
  ): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Generic error regardless of *why* login failed — don't leak which
    // condition tripped (unknown email vs. wrong password vs. inactive).
    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      meta,
    );
    return tokens;
  }

  async refresh(
    rawRefreshToken: string,
    meta: RefreshCookieMeta,
  ): Promise<IssuedTokens> {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // A revoked token being presented again means it was stolen/replayed —
      // revoke the entire chain for this user and force re-login.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      meta,
    );

    const newStored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(tokens.refreshToken) },
    });
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: newStored?.id },
    });

    return tokens;
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async acceptInvite(rawToken: string, password: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const invite = await this.prisma.inviteToken.findUnique({
      where: { tokenHash },
    });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const passwordHash = await argon2.hash(password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: invite.userId },
        data: { passwordHash, isActive: true },
      }),
      this.prisma.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: JwtPayload['role'],
    meta: RefreshCookieMeta,
  ): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role } satisfies JwtPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );

    const rawRefreshToken = randomBytes(32).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: refreshTokenExpiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
    };
  }
}

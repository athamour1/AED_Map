import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    inviteToken: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  const activeUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'ADMIN' as const,
    isActive: true,
    passwordHash: '',
  };

  beforeAll(async () => {
    activeUser.passwordHash = await argon2.hash('correct-password');
  });

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      inviteToken: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: new JwtService({}) },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'test-secret', get: () => undefined },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('rejects an unknown email without revealing that it is unknown', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login('nobody@example.com', 'x', {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      await expect(
        service.login(activeUser.email, 'wrong-password', {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an inactive account even with the correct password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        isActive: false,
      });
      await expect(
        service.login(activeUser.email, 'correct-password', {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a token pair and records the refresh token on success', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      prisma.user.update.mockResolvedValue(activeUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const tokens = await service.login(
        activeUser.email,
        'correct-password',
        {},
      );

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('rejects a token that does not exist', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('unknown-raw-token', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes the entire chain when a revoked token is replayed (theft signal)', async () => {
      const rawToken = 'stolen-token';
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: hashToken(rawToken),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });

      await expect(service.refresh(rawToken, {})).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });

    it('rejects an expired (but not revoked) token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: hashToken('expired-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('expired-token', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates a valid token: revokes the old one and links it to the new one', async () => {
      const rawToken = 'valid-token';
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce({
          id: 'rt-old',
          userId: activeUser.id,
          tokenHash: hashToken(rawToken),
          revokedAt: null,
          expiresAt: new Date(Date.now() + 1000 * 60),
        })
        .mockResolvedValueOnce({ id: 'rt-new' }); // lookup of the newly-created token
      prisma.user.findUnique.mockResolvedValue(activeUser);
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.refreshToken.update.mockResolvedValue({});

      await service.refresh(rawToken, {});

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-old' },
        data: { revokedAt: expect.any(Date) as Date, replacedById: 'rt-new' },
      });
    });
  });

  describe('acceptInvite', () => {
    it('rejects a missing/expired/used invite without distinguishing which', async () => {
      prisma.inviteToken.findUnique.mockResolvedValue(null);
      await expect(
        service.acceptInvite('bogus', 'new-password-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('activates the user and marks the invite used on success', async () => {
      prisma.inviteToken.findUnique.mockResolvedValue({
        id: 'invite-1',
        userId: 'user-2',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      prisma.$transaction.mockResolvedValue([{}, {}]);

      await service.acceptInvite('raw-invite-token', 'new-password-123');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});

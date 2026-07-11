import { randomBytes, createHash } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

export interface InviteResult {
  userId: string;
  email: string;
  inviteToken: string;
  expiresAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(
    email: string,
    displayName: string,
    role: Role,
    invitedById: string,
  ): Promise<InviteResult> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    const user = await this.prisma.user.create({
      data: {
        email,
        displayName,
        role,
        isActive: false,
        invitedById,
        inviteTokens: {
          create: {
            tokenHash: createHash('sha256').update(rawToken).digest('hex'),
            expiresAt,
          },
        },
      },
    });

    return {
      userId: user.id,
      email: user.email,
      inviteToken: rawToken,
      expiresAt,
    };
  }
}

import { randomBytes, createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// Never includes passwordHash — this is the shape returned to the admin UI.
const USER_LIST_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export interface InviteResult {
  userId: string;
  email: string;
  inviteToken: string;
  expiresAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: USER_LIST_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: dto,
        select: USER_LIST_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }

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

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.ADMIN)
  @Post('invite')
  async invite(
    @Body() dto: InviteUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const invite = await this.usersService.invite(
      dto.email,
      dto.displayName,
      dto.role,
      currentUser.id,
    );
    // The raw token is returned exactly once, here — only its hash is ever
    // persisted. The admin copies this link to send to the invitee however
    // they like (email client, Signal, in person).
    return {
      userId: invite.userId,
      email: invite.email,
      inviteToken: invite.inviteToken,
      expiresAt: invite.expiresAt,
    };
  }
}

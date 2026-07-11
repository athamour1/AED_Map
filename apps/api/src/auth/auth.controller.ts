import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OriginCheckGuard } from './guards/origin-check.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import type { IssuedTokens } from './auth.service';

const REFRESH_COOKIE_NAME = 'refreshToken';
// Scoped to /api/auth (not just /api/auth/refresh) so /api/auth/logout can
// also read it — a narrower scope silently breaks logout, since the cookie
// would never be attached to a request that isn't literally /api/auth/refresh.
const REFRESH_COOKIE_PATH = '/api/auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(OriginCheckGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(
      dto.email,
      dto.password,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(OriginCheckGuard)
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = (
      req.cookies as Record<string, string> | undefined
    )?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokens = await this.authService.refresh(
      rawRefreshToken,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = (
      req.cookies as Record<string, string> | undefined
    )?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(rawRefreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  @Post('accept-invite')
  @HttpCode(200)
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    await this.authService.acceptInvite(dto.token, dto.password);
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  private setRefreshCookie(res: Response, tokens: IssuedTokens) {
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: tokens.refreshTokenExpiresAt,
    });
  }

  private requestMeta(req: Request) {
    return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
  }
}

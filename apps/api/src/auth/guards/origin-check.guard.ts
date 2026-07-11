import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Defense-in-depth only — the real CSRF boundary is the refresh cookie's
// httpOnly + SameSite=Strict + Path scoping (see plan §5). A browser-sent
// cross-site request would carry an Origin/Referer that doesn't match; a
// missing header (non-browser clients, older browsers) is allowed through.
@Injectable()
export class OriginCheckGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const appOrigin = this.config.get<string>('APP_ORIGIN');
    if (!appOrigin) return true;

    const origin =
      request.headers.origin ?? this.refererOrigin(request.headers.referer);
    if (!origin) return true;

    if (origin !== appOrigin) {
      throw new ForbiddenException('Origin mismatch');
    }
    return true;
  }

  private refererOrigin(referer: string | undefined): string | undefined {
    if (!referer) return undefined;
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Defense-in-depth only — the real CSRF boundary is the refresh cookie's
// httpOnly + SameSite=Strict + Path scoping (see plan §5). A browser-sent
// cross-site request would carry an Origin/Referer that doesn't match; a
// missing header (non-browser clients, older browsers) is allowed through.
//
// Both sides are reduced to a canonical origin (scheme://host[:port]) before
// comparing, so an APP_ORIGIN written as `https://aed.example.gr/`, with a
// path, quotes or stray whitespace still matches what browsers send — a
// trailing slash in the env file once broke every login in production.
@Injectable()
export class OriginCheckGuard implements CanActivate {
  private readonly logger = new Logger(OriginCheckGuard.name);
  private readonly appOrigin: string | null | undefined;

  constructor(config: ConfigService) {
    const raw = config.get<string>('APP_ORIGIN');
    if (!raw) {
      this.appOrigin = undefined;
      return;
    }
    this.appOrigin = toOrigin(raw.trim().replace(/^["']|["']$/g, ''));
    if (!this.appOrigin) {
      // Fail closed: a set-but-broken value must not silently disable the check.
      this.logger.error(
        `APP_ORIGIN "${raw}" is not a valid URL (expected e.g. https://aed.example.gr) — rejecting all cross-checked requests`,
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.appOrigin === undefined) return true;

    const request: Request = context.switchToHttp().getRequest();
    const sent = request.headers.origin ?? request.headers.referer;
    if (!sent) return true;

    const origin = toOrigin(sent);
    if (!this.appOrigin || origin !== this.appOrigin) {
      this.logger.warn(
        `Origin mismatch: expected ${this.appOrigin ?? '(invalid APP_ORIGIN)'}, got ${origin ?? `unparseable "${sent}"`}`,
      );
      throw new ForbiddenException('Origin mismatch');
    }
    return true;
  }
}

function toOrigin(value: string): string | null {
  try {
    const origin = new URL(value).origin;
    // Opaque origins (e.g. "null", data: URLs) never match a real site.
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

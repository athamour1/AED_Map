import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OriginCheckGuard } from './origin-check.guard';

function guardWith(appOrigin: string | undefined) {
  const config = { get: () => appOrigin } as unknown as ConfigService;
  return new OriginCheckGuard(config);
}

function ctx(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('OriginCheckGuard', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('allows everything when APP_ORIGIN is unset', () => {
    expect(
      guardWith(undefined).canActivate(ctx({ origin: 'https://evil.example' })),
    ).toBe(true);
  });

  it('allows requests with no Origin or Referer', () => {
    expect(guardWith('https://aed.example.gr').canActivate(ctx({}))).toBe(true);
  });

  it('allows the exact origin', () => {
    expect(
      guardWith('https://aed.example.gr').canActivate(
        ctx({ origin: 'https://aed.example.gr' }),
      ),
    ).toBe(true);
  });

  it.each([
    ['trailing slash', 'https://aed.example.gr/'],
    ['a path', 'https://aed.example.gr/admin/'],
    ['surrounding whitespace', '  https://aed.example.gr  '],
    ['surrounding quotes', '"https://aed.example.gr"'],
    ['upper-case host', 'https://AED.Example.gr'],
    ['explicit default port', 'https://aed.example.gr:443'],
  ])('tolerates APP_ORIGIN with %s', (_label, appOrigin) => {
    expect(
      guardWith(appOrigin).canActivate(
        ctx({ origin: 'https://aed.example.gr' }),
      ),
    ).toBe(true);
  });

  it('falls back to the Referer origin', () => {
    const guard = guardWith('https://aed.example.gr');
    expect(
      guard.canActivate(ctx({ referer: 'https://aed.example.gr/admin/login' })),
    ).toBe(true);
  });

  it.each([
    ['another site', 'https://evil.example'],
    ['plain http', 'http://aed.example.gr'],
    ['another port', 'https://aed.example.gr:8443'],
    ['a sibling subdomain', 'https://sed.example.gr'],
    ['a garbage header', 'not a url'],
  ])('rejects %s', (_label, origin) => {
    expect(() =>
      guardWith('https://aed.example.gr/').canActivate(ctx({ origin })),
    ).toThrow(ForbiddenException);
  });

  it('rejects everything when APP_ORIGIN is set but unparseable', () => {
    expect(() =>
      guardWith('aed.example.gr').canActivate(
        ctx({ origin: 'https://aed.example.gr' }),
      ),
    ).toThrow(ForbiddenException);
  });
});

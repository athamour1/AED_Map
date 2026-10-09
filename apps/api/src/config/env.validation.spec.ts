import { validateEnv } from './env.validation';

const DATABASE_URL = 'postgresql://u:p@db:5432/x';
const STRONG = 'k3p0Qw9Zr7XvB2nLm8YtH4sJd6FgA1cE5uIoP0aSdF=';

describe('validateEnv', () => {
  it('accepts a strong secret', () => {
    expect(() =>
      validateEnv({ DATABASE_URL, JWT_ACCESS_SECRET: STRONG }),
    ).not.toThrow();
  });

  it('rejects missing variables', () => {
    expect(() => validateEnv({ DATABASE_URL })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it.each([
    [
      'an unexpanded $(...) command',
      "$(openssl rand -base64 48 | tr -d '\\n')",
    ],
    ['a backtick command', '`openssl rand -base64 48`............'],
    ['the example placeholder', 'change-me'],
    ['a short secret', 'tooshort'],
  ])('rejects %s', (_label, secret) => {
    expect(() =>
      validateEnv({ DATABASE_URL, JWT_ACCESS_SECRET: secret }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });
});

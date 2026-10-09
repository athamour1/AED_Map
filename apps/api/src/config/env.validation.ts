const REQUIRED_VARS = ['DATABASE_URL', 'JWT_ACCESS_SECRET'] as const;

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set(['change-me', 'changeme', 'secret']);

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_VARS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  assertStrongSecret(String(config.JWT_ACCESS_SECRET));
  return config;
}

// Anyone who knows the signing secret can mint valid access tokens for any
// user, so refuse to boot on one that is guessable. The `$(` / backtick case
// is the real-world failure: a shell snippet like `$(openssl rand ...)` pasted
// into a deployment UI's env editor is stored literally, not executed.
function assertStrongSecret(secret: string): void {
  if (secret.includes('$(') || secret.includes('`')) {
    throw new Error(
      'JWT_ACCESS_SECRET contains an unexpanded shell command ("$(" or "`") — ' +
        'run `openssl rand -base64 48` in a terminal and paste its output instead',
    );
  }
  if (PLACEHOLDER_SECRETS.has(secret.trim().toLowerCase())) {
    throw new Error(
      'JWT_ACCESS_SECRET is still a placeholder — generate one with `openssl rand -base64 48`',
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_ACCESS_SECRET must be at least ${MIN_SECRET_LENGTH} characters — generate one with \`openssl rand -base64 48\``,
    );
  }
}

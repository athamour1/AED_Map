import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// One-time bootstrap for the first admin account. Never exposed over HTTP —
// run manually on the VPS: `docker compose exec api node dist/cli/create-admin.js`
// Idempotent: does nothing if a user with this email already exists.
async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const displayName = process.env.ADMIN_BOOTSTRAP_DISPLAY_NAME ?? 'Admin';

  if (!email || !password) {
    console.error(
      'ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set.',
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`User ${email} already exists — skipping.`);
      return;
    }

    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: { email, displayName, passwordHash, role: 'ADMIN', isActive: true },
    });
    console.log(`Created admin account for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

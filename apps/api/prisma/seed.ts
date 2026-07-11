import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface SourceLocation {
  name: string;
  locationDetails: string;
  lat: number;
  lng: number;
  isAvailable: boolean;
  is24h: boolean;
  schedule: Record<string, { open: string; close: string }[]> | null;
}

async function main() {
  const existing = await prisma.location.count();
  if (existing > 0) {
    console.log(`Skipping seed — ${existing} location(s) already present.`);
    return;
  }

  const sourcePath = join(__dirname, '../../public/src/assets/aed-locations.json');
  const source: SourceLocation[] = JSON.parse(readFileSync(sourcePath, 'utf-8'));

  await prisma.location.createMany({
    data: source.map((entry) => ({
      name: entry.name,
      addressText: entry.locationDetails,
      lat: entry.lat,
      lng: entry.lng,
      isAvailable: entry.isAvailable,
      is24h: entry.is24h,
      schedule: entry.schedule ?? undefined,
    })),
  });

  console.log(`Seeded ${source.length} locations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

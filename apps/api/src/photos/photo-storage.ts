import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type PhotoVariant = 'full' | 'thumb';
export const PHOTO_VARIANTS: readonly PhotoVariant[] = ['full', 'thumb'];

/**
 * Where photo files live. Kept outside the database: Postgres stays small and
 * backups of the two can be taken separately. In the container this is a
 * named volume (UPLOAD_DIR=/data/uploads, see apps/api/Dockerfile).
 */
export function uploadDir(): string {
  return resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'));
}

/** File name for a photo variant. `id` is always a server-generated UUID. */
export function photoFileName(id: string, variant: PhotoVariant): string {
  return variant === 'thumb' ? `${id}.thumb.webp` : `${id}.webp`;
}

export async function writePhotoFiles(
  id: string,
  files: Record<PhotoVariant, Buffer>,
): Promise<void> {
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await Promise.all(
    PHOTO_VARIANTS.map((variant) =>
      writeFile(join(dir, photoFileName(id, variant)), files[variant]),
    ),
  );
}

/** Best effort: a leftover file is harmless, a thrown error here is not. */
export async function deletePhotoFiles(ids: string[]): Promise<void> {
  const dir = uploadDir();
  await Promise.all(
    ids.flatMap((id) =>
      PHOTO_VARIANTS.map((variant) =>
        rm(join(dir, photoFileName(id, variant)), { force: true }).catch(
          () => undefined,
        ),
      ),
    ),
  );
}

import sharp from 'sharp';
import type { PhotoVariant } from './photo-storage';

export const FULL_MAX_EDGE = 1600;
export const THUMB_MAX_EDGE = 480;

/** sharp's names. `heif` covers AVIF (HEIC needs a non-free codec). */
const ACCEPTED_FORMATS = new Set([
  'jpeg',
  'png',
  'webp',
  'gif',
  'tiff',
  'heif',
]);

export interface ProcessedPhoto {
  files: Record<PhotoVariant, Buffer>;
  width: number;
  height: number;
}

export class UnreadableImageError extends Error {}

/**
 * Re-encodes an upload into the two WebP variants we serve.
 *
 * Never store or serve the uploaded bytes as-is: decoding and re-encoding
 * means only a real image can come out (no polyglot/HTML files served from our
 * origin), and sharp drops all metadata on output — phone photos carry the
 * GPS position and device details in EXIF. `.rotate()` applies the EXIF
 * orientation first so portrait shots stay upright once it's gone.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  // ~50 MP: larger than any phone camera, small enough to refuse
  // decompression bombs before they take the api's memory.
  const source = () =>
    sharp(input, { limitInputPixels: 50_000_000, failOn: 'error' }).rotate();

  try {
    // Only photo formats. SVG in particular is refused: it is a document that
    // can reference other files, not a picture someone took of an AED.
    const { format } = await sharp(input).metadata();
    if (!format || !ACCEPTED_FORMATS.has(format)) {
      throw new Error(`unsupported format: ${format ?? 'unknown'}`);
    }

    const full = await source()
      .resize(FULL_MAX_EDGE, FULL_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    const thumb = await source()
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 72 })
      .toBuffer();

    return {
      files: { full: full.data, thumb },
      width: full.info.width,
      height: full.info.height,
    };
  } catch (error) {
    throw new UnreadableImageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

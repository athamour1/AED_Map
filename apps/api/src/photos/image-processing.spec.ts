import sharp from 'sharp';
import {
  FULL_MAX_EDGE,
  processPhoto,
  THUMB_MAX_EDGE,
  UnreadableImageError,
} from './image-processing';

function jpeg(width: number, height: number, withExif = false) {
  let img = sharp({
    create: { width, height, channels: 3, background: '#c00' },
  }).jpeg();
  if (withExif) {
    img = img.withExif({
      IFD0: { Make: 'PhoneCo', Model: 'Phone 9' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '37/1 59/1 0/1' },
    });
  }
  return img.toBuffer();
}

describe('processPhoto', () => {
  it('shrinks large photos to WebP within the size limits', async () => {
    const result = await processPhoto(await jpeg(4000, 3000));
    expect(result.width).toBe(FULL_MAX_EDGE);
    expect(result.height).toBe(1200);

    const full = await sharp(result.files.full).metadata();
    const thumb = await sharp(result.files.thumb).metadata();
    expect(full.format).toBe('webp');
    expect(thumb.format).toBe('webp');
    expect(Math.max(thumb.width, thumb.height)).toBe(THUMB_MAX_EDGE);
  });

  it('never enlarges small photos', async () => {
    const result = await processPhoto(await jpeg(300, 200));
    expect([result.width, result.height]).toEqual([300, 200]);
  });

  it('strips EXIF (camera and GPS) from the output', async () => {
    const input = await jpeg(800, 600, true);
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const result = await processPhoto(input);
    expect((await sharp(result.files.full).metadata()).exif).toBeUndefined();
    expect((await sharp(result.files.thumb).metadata()).exif).toBeUndefined();
  });

  it('rejects SVG even though it can be rendered', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    );
    await expect(processPhoto(svg)).rejects.toThrow(UnreadableImageError);
  });

  it('rejects files that are not images', async () => {
    await expect(
      processPhoto(Buffer.from('<html><script>alert(1)</script></html>')),
    ).rejects.toThrow(UnreadableImageError);
  });
});

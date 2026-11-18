import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BadRequestException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import sharp from 'sharp';
import { MAX_PHOTOS_PER_LOCATION, PhotosService } from './photos.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('PhotosService', () => {
  let dir: string;
  let service: PhotosService;
  let prisma: {
    location: { findUnique: jest.Mock };
    locationPhoto: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const image = () =>
    sharp({
      create: { width: 50, height: 40, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aed-photos-'));
    process.env.UPLOAD_DIR = dir;
    prisma = {
      location: {
        findUnique: jest.fn().mockResolvedValue({ _count: { photos: 0 } }),
      },
      locationPhoto: {
        findFirst: jest.fn().mockResolvedValue({ sortOrder: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(({ data }: { data: unknown }) => Promise.resolve(data)),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new PhotosService(prisma as unknown as PrismaService);
  });

  afterEach(async () => {
    delete process.env.UPLOAD_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it('stores both variants and appends the photo at the end', async () => {
    const photo = await service.addToLocation(
      'loc',
      await image(),
      '  Lobby  ',
    );
    expect(photo).toMatchObject({
      locationId: 'loc',
      caption: 'Lobby',
      width: 50,
      height: 40,
      sortOrder: 3,
    });
    expect((await readdir(dir)).sort()).toEqual(
      [`${photo.id}.thumb.webp`, `${photo.id}.webp`].sort(),
    );
  });

  it('404s for a missing location', async () => {
    prisma.location.findUnique.mockResolvedValue(null);
    await expect(service.addToLocation('x', await image())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refuses more than the per-location limit', async () => {
    prisma.location.findUnique.mockResolvedValue({
      _count: { photos: MAX_PHOTOS_PER_LOCATION },
    });
    await expect(service.addToLocation('loc', await image())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects non-images with 415 and writes nothing', async () => {
    await expect(
      service.addToLocation('loc', Buffer.from('not an image')),
    ).rejects.toThrow(UnsupportedMediaTypeException);
    expect(await readdir(dir)).toEqual([]);
  });

  it('removes the files again when the insert fails', async () => {
    prisma.locationPhoto.create.mockRejectedValue(new Error('db down'));
    await expect(service.addToLocation('loc', await image())).rejects.toThrow(
      'db down',
    );
    expect(await readdir(dir)).toEqual([]);
  });

  it('remove deletes the row and its files', async () => {
    const photo = await service.addToLocation('loc', await image());
    await service.remove(photo.id);
    expect(prisma.locationPhoto.delete).toHaveBeenCalledWith({
      where: { id: photo.id },
    });
    expect(await readdir(dir)).toEqual([]);
  });

  it('reorder requires every photo of the location exactly once', async () => {
    prisma.locationPhoto.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(service.reorder('loc', ['a'])).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.reorder('loc', ['a', 'a'])).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.reorder('loc', ['a', 'c'])).rejects.toThrow(
      BadRequestException,
    );
    await service.reorder('loc', ['b', 'a']);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.locationPhoto.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { sortOrder: 0 },
    });
  });
});

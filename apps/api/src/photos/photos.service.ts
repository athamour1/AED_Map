import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProcessedPhoto,
  processPhoto,
  UnreadableImageError,
} from './image-processing';
import { deletePhotoFiles, writePhotoFiles } from './photo-storage';

export const MAX_PHOTOS_PER_LOCATION = 10;

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

function normalizeCaption(caption: string | undefined): string | null {
  const trimmed = caption?.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addToLocation(locationId: string, image: Buffer, caption?: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { _count: { select: { photos: true } } },
    });
    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }
    if (location._count.photos >= MAX_PHOTOS_PER_LOCATION) {
      throw new BadRequestException(
        `A location can have at most ${MAX_PHOTOS_PER_LOCATION} photos — delete one first`,
      );
    }

    let processed: ProcessedPhoto;
    try {
      processed = await processPhoto(image);
    } catch (error) {
      if (error instanceof UnreadableImageError) {
        throw new UnsupportedMediaTypeException(
          'Could not read this file as an image — upload a JPEG, PNG, WebP or AVIF photo',
        );
      }
      throw error;
    }

    // Files first, row second: a row must never point at missing files. If
    // the insert fails the files are removed again.
    const id = randomUUID();
    await writePhotoFiles(id, processed.files);
    try {
      const last = await this.prisma.locationPhoto.findFirst({
        where: { locationId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      return await this.prisma.locationPhoto.create({
        data: {
          id,
          locationId,
          caption: normalizeCaption(caption),
          width: processed.width,
          height: processed.height,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    } catch (error) {
      await deletePhotoFiles([id]);
      throw error;
    }
  }

  async update(id: string, caption: string | undefined) {
    try {
      return await this.prisma.locationPhoto.update({
        where: { id },
        data:
          caption === undefined ? {} : { caption: normalizeCaption(caption) },
      });
    } catch (error) {
      if (isNotFoundError(error))
        throw new NotFoundException(`Photo ${id} not found`);
      throw error;
    }
  }

  async reorder(locationId: string, ids: string[]) {
    const existing = await this.prisma.locationPhoto.findMany({
      where: { locationId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));
    if (
      ids.length !== existingIds.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => existingIds.has(id))
    ) {
      throw new BadRequestException(
        "ids must list each of this location's photos exactly once",
      );
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        this.prisma.locationPhoto.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );
    return this.listForLocation(locationId);
  }

  listForLocation(locationId: string) {
    return this.prisma.locationPhoto.findMany({
      where: { locationId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.locationPhoto.delete({ where: { id } });
    } catch (error) {
      if (isNotFoundError(error))
        throw new NotFoundException(`Photo ${id} not found`);
      throw error;
    }
    await this.deleteFiles([id]);
  }

  /** For callers that delete photo rows indirectly (location cascade). */
  async deleteFiles(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      await deletePhotoFiles(ids);
    } catch (error) {
      this.logger.warn(`Could not delete photo files: ${String(error)}`);
    }
  }
}

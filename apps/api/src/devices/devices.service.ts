import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

const DATE_FIELDS = [
  'installDate',
  'batteryExpirationDate',
  'padsExpirationDate',
  'lastInspectionDate',
  'nextInspectionDue',
] as const;

function toPrismaData<
  T extends Partial<Record<(typeof DATE_FIELDS)[number], string>>,
>(dto: T): Record<string, unknown> {
  const data: Record<string, unknown> = { ...dto };
  for (const field of DATE_FIELDS) {
    if (dto[field] !== undefined) {
      data[field] = new Date(dto[field]);
    }
  }
  return data;
}

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(locationId: string, dto: CreateDeviceDto) {
    return this.prisma.device.create({
      data: {
        ...toPrismaData(dto),
        locationId,
      } as Prisma.DeviceUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdateDeviceDto) {
    try {
      return await this.prisma.device.update({
        where: { id },
        data: toPrismaData(dto),
      });
    } catch (error) {
      if (isNotFoundError(error))
        throw new NotFoundException(`Device ${id} not found`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.device.delete({ where: { id } });
    } catch (error) {
      if (isNotFoundError(error))
        throw new NotFoundException(`Device ${id} not found`);
      throw error;
    }
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

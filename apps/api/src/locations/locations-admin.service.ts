import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

@Injectable()
export class LocationsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.location.findMany({
      include: { devices: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: { devices: true },
    });
    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return location;
  }

  create(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
  }

  async update(id: string, dto: UpdateLocationDto) {
    try {
      return await this.prisma.location.update({ where: { id }, data: dto });
    } catch (error) {
      if (isNotFoundError(error))
        throw new NotFoundException(`Location ${id} not found`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // FK is `onDelete: Cascade` in schema.prisma — this also deletes the
      // location's devices, not just the location row.
      await this.prisma.location.delete({ where: { id } });
    } catch (error) {
      if (isNotFoundError(error))
        throw new NotFoundException(`Location ${id} not found`);
      throw error;
    }
  }
}

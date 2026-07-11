import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fields exposed to the public. Deliberately a `select`, never an `include` of
// `devices` — the public response can never leak hardware/expiration data
// because the query itself never reaches that relation.
const PUBLIC_LOCATION_SELECT = {
  id: true,
  name: true,
  addressText: true,
  lat: true,
  lng: true,
  isAvailable: true,
  is24h: true,
  schedule: true,
} as const;

@Controller('locations')
export class LocationsPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.location.findMany({
      select: PUBLIC_LOCATION_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      select: PUBLIC_LOCATION_SELECT,
    });
    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return location;
  }
}

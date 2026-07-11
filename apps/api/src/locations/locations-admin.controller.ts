import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LocationsAdminService } from './locations-admin.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { DevicesService } from '../devices/devices.service';
import { CreateDeviceDto } from '../devices/dto/create-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Deliberately a controller entirely separate from LocationsPublicController
// (see plan §4) — this one includes the `devices` relation, the public one
// structurally never does.
@UseGuards(JwtAuthGuard)
@Controller('admin/locations')
export class LocationsAdminController {
  constructor(
    private readonly locationsAdminService: LocationsAdminService,
    private readonly devicesService: DevicesService,
  ) {}

  @Get()
  findAll() {
    return this.locationsAdminService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationsAdminService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLocationDto) {
    return this.locationsAdminService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsAdminService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.locationsAdminService.remove(id);
  }

  @Post(':id/devices')
  async addDevice(@Param('id') id: string, @Body() dto: CreateDeviceDto) {
    await this.locationsAdminService.findOne(id); // 404s if the location doesn't exist
    return this.devicesService.create(id, dto);
  }
}

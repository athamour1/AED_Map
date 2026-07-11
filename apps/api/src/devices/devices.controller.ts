import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.devicesService.remove(id);
  }
}

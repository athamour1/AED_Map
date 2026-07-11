import { Module } from '@nestjs/common';
import { LocationsPublicController } from './locations-public.controller';
import { LocationsAdminController } from './locations-admin.controller';
import { LocationsAdminService } from './locations-admin.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  controllers: [LocationsPublicController, LocationsAdminController],
  providers: [LocationsAdminService],
})
export class LocationsModule {}

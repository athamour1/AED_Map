import { Module } from '@nestjs/common';
import { LocationsPublicController } from './locations-public.controller';

@Module({
  controllers: [LocationsPublicController],
})
export class LocationsModule {}

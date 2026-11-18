import { Module } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { PhotosAdminController } from './photos-admin.controller';

@Module({
  controllers: [PhotosAdminController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}

import { Module } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { PhotosAdminController } from './photos-admin.controller';
import { PhotosPublicController } from './photos-public.controller';

@Module({
  controllers: [PhotosAdminController, PhotosPublicController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}

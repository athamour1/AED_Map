import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PhotosService } from './photos.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';

/** Upload limit. The gateway allows a little more (infra/nginx.conf). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class PhotosAdminController {
  constructor(private readonly photosService: PhotosService) {}

  // multipart/form-data: `file` (the image) and an optional `caption`.
  // Kept in memory — it is re-encoded straight away and never stored as sent.
  @Post('locations/:id/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
    }),
  )
  upload(
    @Param('id', ParseUUIDPipe) locationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadPhotoDto,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Attach the image as the "file" field');
    }
    return this.photosService.addToLocation(
      locationId,
      file.buffer,
      dto.caption,
    );
  }

  @Put('locations/:id/photos/order')
  reorder(
    @Param('id', ParseUUIDPipe) locationId: string,
    @Body() dto: ReorderPhotosDto,
  ) {
    return this.photosService.reorder(locationId, dto.ids);
  }

  @Patch('photos/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePhotoDto) {
    return this.photosService.update(id, dto.caption);
  }

  @Delete('photos/:id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.photosService.remove(id);
  }
}

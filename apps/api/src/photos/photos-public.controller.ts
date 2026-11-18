import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  PHOTO_VARIANTS,
  photoFileName,
  PhotoVariant,
  uploadDir,
} from './photo-storage';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Photos are public, like the location they belong to. A photo id never gets
// new content (a replaced photo is a new id), so responses are immutable.
@Controller('photos')
export class PhotosPublicController {
  @Get(':id/:variant')
  serve(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variant') variant: string,
    @Res() res: Response,
  ) {
    if (!PHOTO_VARIANTS.includes(variant as PhotoVariant)) {
      throw new NotFoundException();
    }
    // `id` is a validated UUID, so the name can't escape uploadDir; `root`
    // makes send() enforce that as well.
    res.sendFile(
      photoFileName(id, variant as PhotoVariant),
      {
        root: uploadDir(),
        maxAge: ONE_YEAR_MS,
        immutable: true,
        headers: { 'Content-Type': 'image/webp' },
      },
      (error?: Error & { status?: number }) => {
        if (!error || res.headersSent) return;
        res
          .status(error.status === 404 ? 404 : 500)
          .set('Cache-Control', 'no-store')
          .json({ statusCode: error.status === 404 ? 404 : 500 });
      },
    );
  }
}

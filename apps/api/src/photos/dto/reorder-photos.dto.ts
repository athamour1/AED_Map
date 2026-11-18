import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import { MAX_PHOTOS_PER_LOCATION } from '../photos.service';

export class ReorderPhotosDto {
  /** Every photo id of the location, in the new display order. */
  @IsArray()
  @ArrayMaxSize(MAX_PHOTOS_PER_LOCATION)
  @IsUUID('all', { each: true })
  ids!: string[];
}

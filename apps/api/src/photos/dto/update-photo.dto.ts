import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePhotoDto {
  /** An empty string clears the caption. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}

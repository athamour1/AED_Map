import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { Prisma } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  name!: string;

  @IsString()
  addressText!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  is24h?: boolean;

  @IsOptional()
  @IsObject()
  schedule?: Prisma.InputJsonValue;
}

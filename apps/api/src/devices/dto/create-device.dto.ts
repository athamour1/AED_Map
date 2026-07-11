import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  serialNumber!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsDateString()
  installDate?: string;

  @IsOptional()
  @IsDateString()
  batteryExpirationDate?: string;

  @IsOptional()
  @IsDateString()
  padsExpirationDate?: string;

  @IsOptional()
  @IsDateString()
  lastInspectionDate?: string;

  @IsOptional()
  @IsDateString()
  nextInspectionDue?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

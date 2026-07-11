import { IsEmail, IsEnum, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  displayName!: string;

  @IsEnum(Role)
  role!: Role;
}

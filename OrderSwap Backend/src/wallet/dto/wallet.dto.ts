import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWalletDto {
  @ApiProperty({ description: 'Wallet name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Is wallet active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}


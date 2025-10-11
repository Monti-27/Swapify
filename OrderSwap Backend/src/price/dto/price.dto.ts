import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPriceDto {
  @ApiProperty({ description: 'Token address' })
  @IsString()
  token: string;
}

export class GetBatchPricesDto {
  @ApiProperty({ description: 'Array of token addresses' })
  @IsArray()
  @IsString({ each: true })
  tokens: string[];
}


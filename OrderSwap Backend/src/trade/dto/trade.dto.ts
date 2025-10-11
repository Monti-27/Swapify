import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PrepareTradeDto {
  @ApiProperty({ description: 'Token to sell (address)' })
  @IsString()
  fromToken: string;

  @ApiProperty({ description: 'Token to buy (address)' })
  @IsString()
  toToken: string;

  @ApiProperty({ description: 'Amount to trade' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Strategy ID if part of automated strategy', required: false })
  @IsString()
  @IsOptional()
  strategyId?: string;
}

export class ExecuteTradeDto {
  @ApiProperty({ description: 'Signed transaction (base64 encoded)' })
  @IsString()
  signedTransaction: string;
}

export class SimulateTradeDto {
  @ApiProperty({ description: 'Token to sell (address)' })
  @IsString()
  fromToken: string;

  @ApiProperty({ description: 'Token to buy (address)' })
  @IsString()
  toToken: string;

  @ApiProperty({ description: 'Amount to trade' })
  @IsNumber()
  @Min(0)
  amount: number;
}


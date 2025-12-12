import { IsString, IsNumber, IsOptional, IsEnum, IsObject, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';

export class CreateStrategyDto {
  @ApiProperty({ description: 'Strategy name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Strategy description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Token to sell (address)' })
  @IsString()
  fromToken: string;

  @ApiProperty({ description: 'Token to buy (address)' })
  @IsString()
  toToken: string;

  @ApiProperty({ description: 'Trigger type', enum: ['price', 'marketCap'] })
  @IsEnum(['price', 'marketCap'])
  triggerType: string;

  @ApiProperty({ description: 'Trigger value (price or market cap)' })
  @IsNumber()
  @Min(0)
  triggerValue: number;

  @ApiProperty({ description: 'Amount type', enum: ['percentage', 'fixed'] })
  @IsEnum(['percentage', 'fixed'])
  amountType: string;

  @ApiProperty({ description: 'Amount to trade' })
  @IsNumber()
  @Min(0)
  @Max(100)
  amount: number;

  @ApiProperty({ description: 'Stop loss value', required: false })
  @IsNumber()
  @IsOptional()
  stopLoss?: number;

  @ApiProperty({ description: 'Take profit value', required: false })
  @IsNumber()
  @IsOptional()
  takeProfit?: number;

  @ApiProperty({ description: 'Next strategy ID for chaining', required: false })
  @IsString()
  @IsOptional()
  nextStrategyId?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateStrategyDto {
  @ApiProperty({ description: 'Strategy name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Strategy description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Trigger value', required: false })
  @IsNumber()
  @IsOptional()
  triggerValue?: number;

  @ApiProperty({ description: 'Amount to trade', required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Stop loss value', required: false })
  @IsNumber()
  @IsOptional()
  stopLoss?: number;

  @ApiProperty({ description: 'Take profit value', required: false })
  @IsNumber()
  @IsOptional()
  takeProfit?: number;

  @ApiProperty({ description: 'Strategy status', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: any;
}


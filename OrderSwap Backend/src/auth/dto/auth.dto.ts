import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetMessageDto {
  @ApiProperty({ description: 'Wallet public key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}

export class AuthenticateDto {
  @ApiProperty({ description: 'Wallet public key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ description: 'Signed message' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Original message that was signed' })
  @IsString()
  @IsNotEmpty()
  message: string;
}


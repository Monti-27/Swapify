import { IsEmail, IsString, IsOptional, Matches, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinWaitlistDto {
    @ApiProperty({ description: 'User email address' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;

    @ApiProperty({ description: 'Solana wallet address (base58)' })
    @IsString()
    @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
        message: 'Please provide a valid Solana wallet address',
    })
    walletAddress: string;

    @ApiPropertyOptional({ description: 'Referral code from another user' })
    @IsOptional()
    @IsString()
    referredByCode?: string;
}

export class VerifySocialDto {
    @ApiProperty({ description: 'Waitlist user ID' })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Social platform', enum: ['twitter', 'telegram'] })
    @IsIn(['twitter', 'telegram'], { message: 'Platform must be twitter or telegram' })
    platform: 'twitter' | 'telegram';

    @ApiPropertyOptional({ description: 'Social media username (without @)' })
    @IsOptional()
    @IsString()
    username?: string;
}

export class GetWaitlistUserDto {
    @ApiPropertyOptional({ description: 'User email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Solana wallet address' })
    @IsOptional()
    @IsString()
    walletAddress?: string;
}

import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanWalletDto {
    @ApiProperty({
        description: 'Solana wallet address to scan',
        example: 'DfU2a3TJoJPjLhMCAQ9V3uPBhC98kD5gDqQHLiPvWpwq',
    })
    @IsString()
    @Length(32, 44)
    @Matches(/^[1-9A-HJ-NP-Za-km-z]+$/, {
        message: 'Invalid Solana address format (base58)',
    })
    address: string;
}

export class WalletAddressParam {
    @ApiProperty({
        description: 'Solana wallet address',
        example: 'DfU2a3TJoJPjLhMCAQ9V3uPBhC98kD5gDqQHLiPvWpwq',
    })
    @IsString()
    @Length(32, 44)
    address: string;
}

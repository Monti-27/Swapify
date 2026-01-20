import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto, VerifySocialDto } from './dto/waitlist.dto';

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
    constructor(private waitlistService: WaitlistService) { }

    @Post('join')
    @ApiOperation({ summary: 'Join the waitlist or recover existing account' })
    async joinWaitlist(@Body() dto: JoinWaitlistDto) {
        return this.waitlistService.joinWaitlist(dto);
    }

    @Post('verify')
    @ApiOperation({ summary: 'Verify social task completion and earn points' })
    async verifySocial(@Body() dto: VerifySocialDto) {
        return this.waitlistService.verifySocial(dto);
    }

    @Get('user')
    @ApiOperation({ summary: 'Get waitlist user by email or wallet' })
    @ApiQuery({ name: 'email', required: false })
    @ApiQuery({ name: 'walletAddress', required: false })
    async getUser(
        @Query('email') email?: string,
        @Query('walletAddress') walletAddress?: string,
    ) {
        return this.waitlistService.getUser(email, walletAddress);
    }

    @Get('leaderboard')
    @ApiOperation({ summary: 'Get top users by points' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getLeaderboard(@Query('limit') limit?: string) {
        return this.waitlistService.getLeaderboard(limit ? parseInt(limit, 10) : 10);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get waitlist statistics' })
    async getStats() {
        return this.waitlistService.getStats();
    }
}

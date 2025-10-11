import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticateDto, GetMessageDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('message')
  @ApiOperation({ summary: 'Get authentication message to sign' })
  @ApiBody({ type: GetMessageDto })
  async getAuthMessage(@Body() dto: GetMessageDto) {
    const message = this.authService.generateAuthMessage(dto.publicKey);
    return { message };
  }

  @Post('authenticate')
  @ApiOperation({ summary: 'Authenticate with wallet signature' })
  @ApiBody({ type: AuthenticateDto })
  async authenticate(@Body() dto: AuthenticateDto) {
    return this.authService.authenticateWallet(
      dto.publicKey,
      dto.signature,
      dto.message,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  async getMe(@Request() req) {
    return req.user;
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Request() req) {
    return this.authService.refreshToken(req.user.userId, req.user.walletId);
  }
}


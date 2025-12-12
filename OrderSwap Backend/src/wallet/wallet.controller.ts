import { Controller, Get, Param, UseGuards, Request, Patch, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateWalletDto } from './dto/wallet.dto';

@ApiTags('wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wallets for current user' })
  async getWallets(@Request() req) {
    return this.walletService.getUserWallets(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  async getWallet(@Param('id') id: string) {
    return this.walletService.getWallet(id);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get wallet balances' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  async getWalletBalance(@Param('id') id: string) {
    const wallet = await this.walletService.getWallet(id);
    return this.walletService.getAllTokenBalances(wallet.publicKey);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update wallet' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  async updateWallet(@Param('id') id: string, @Body() dto: UpdateWalletDto) {
    return this.walletService.updateWallet(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete wallet' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  async deleteWallet(@Param('id') id: string) {
    return this.walletService.deleteWallet(id);
  }
}


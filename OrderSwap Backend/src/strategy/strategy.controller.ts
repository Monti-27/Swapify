import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StrategyService } from './strategy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateStrategyDto, UpdateStrategyDto } from './dto/strategy.dto';

@ApiTags('strategies')
@Controller('strategies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StrategyController {
  constructor(private strategyService: StrategyService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new trading strategy' })
  async createStrategy(@Request() req, @Body() dto: CreateStrategyDto) {
    return this.strategyService.createStrategy(
      req.user.userId,
      req.user.walletId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all strategies for current user' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'walletId', required: false })
  async getStrategies(
    @Request() req,
    @Query('status') status?: string,
    @Query('walletId') walletId?: string,
  ) {
    return this.strategyService.getUserStrategies(req.user.userId, {
      status,
      walletId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get strategy statistics' })
  async getStats(@Request() req) {
    return this.strategyService.getStrategyStats(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get strategy by ID' })
  @ApiParam({ name: 'id', description: 'Strategy ID' })
  async getStrategy(@Request() req, @Param('id') id: string) {
    return this.strategyService.getStrategy(id, req.user.userId);
  }

  @Patch(':address/metadata')
  @ApiOperation({ summary: 'Update strategy metadata by PDA address' })
  @ApiParam({ name: 'address', description: 'Strategy PDA address' })
  async updateMetadata(
    @Param('address') address: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.strategyService.updateMetadata(address, body.name, body.description);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update strategy' })
  @ApiParam({ name: 'id', description: 'Strategy ID' })
  async updateStrategy(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStrategyDto,
  ) {
    return this.strategyService.updateStrategy(id, req.user.userId, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel strategy' })
  @ApiParam({ name: 'id', description: 'Strategy ID' })
  async cancelStrategy(@Request() req, @Param('id') id: string) {
    return this.strategyService.cancelStrategy(id, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete strategy' })
  @ApiParam({ name: 'id', description: 'Strategy ID' })
  async deleteStrategy(@Request() req, @Param('id') id: string) {
    return this.strategyService.deleteStrategy(id, req.user.userId);
  }
}


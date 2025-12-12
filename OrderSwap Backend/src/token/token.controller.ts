import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TokenService } from './token.service';

@ApiTags('tokens')
@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tradable tokens' })
  @ApiResponse({ status: 200, description: 'Returns list of all tradable tokens' })
  @ApiQuery({ name: 'refresh', required: false, type: Boolean, description: 'Force refresh token cache' })
  async getAllTokens(@Query('refresh') refresh?: string) {
    const forceRefresh = refresh === 'true';
    return this.tokenService.getAllTokens(forceRefresh);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular/verified tokens' })
  @ApiResponse({ status: 200, description: 'Returns list of popular tokens' })
  async getPopularTokens() {
    return this.tokenService.getPopularTokens();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tokens by name or symbol' })
  @ApiResponse({ status: 200, description: 'Returns matching tokens' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default: 50)' })
  async searchTokens(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.tokenService.searchTokens(query, limitNum);
  }

  @Get('tag/:tag')
  @ApiOperation({ summary: 'Get tokens by category/tag' })
  @ApiResponse({ status: 200, description: 'Returns tokens with specified tag' })
  async getTokensByTag(@Param('tag') tag: string) {
    return this.tokenService.getTokensByTag(tag);
  }

  @Get(':mint')
  @ApiOperation({ summary: 'Get token details by mint address' })
  @ApiResponse({ status: 200, description: 'Returns token details' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async getTokenByMint(@Param('mint') mint: string) {
    return this.tokenService.getTokenByMint(mint);
  }
}


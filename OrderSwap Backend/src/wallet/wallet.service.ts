import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private connection: Connection;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get('SOLANA_RPC_URL');
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string) {
    return this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        user: true,
      },
    });
  }

  /**
   * Get all wallets for a user
   */
  async getUserWallets(userId: string) {
    return this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get SOL balance for a wallet
   */
  async getSolBalance(publicKey: string): Promise<number> {
    try {
      const pubkey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  /**
   * Get SPL token balance for a wallet
   * Returns HUMAN-READABLE balance (e.g., 1.5 USDC, not 1500000)
   */
  async getTokenBalance(walletPublicKey: string, tokenMint: string): Promise<number> {
    try {
      const walletPubkey = new PublicKey(walletPublicKey);
      const mintPubkey = new PublicKey(tokenMint);

      // Get the associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        walletPubkey,
      );

      // Get the account info (contains raw balance)
      const accountInfo = await getAccount(this.connection, tokenAccount);
      const rawBalance = Number(accountInfo.amount);

      // Get the token's decimals to convert to human-readable
      const mintInfo = await getMint(this.connection, mintPubkey);
      const decimals = mintInfo.decimals;

      // Convert to human-readable (e.g., 1500000 with 6 decimals = 1.5)
      const humanReadableBalance = rawBalance / Math.pow(10, decimals);

      this.logger.debug(`Token balance for ${tokenMint.slice(0, 8)}...: ${humanReadableBalance} (raw: ${rawBalance}, decimals: ${decimals})`);
      
      return humanReadableBalance;
    } catch (error) {
      // Token account might not exist yet
      this.logger.warn(`Token account not found for ${tokenMint}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get all token balances for a wallet
   */
  async getAllTokenBalances(publicKey: string) {
    try {
      const pubkey = new PublicKey(publicKey);
      
      // Get SOL balance
      const solBalance = await this.getSolBalance(publicKey);

      // Get token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        pubkey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') },
      );

      const tokens = tokenAccounts.value.map((accountInfo) => {
        const parsedInfo = accountInfo.account.data.parsed.info;
        return {
          mint: parsedInfo.mint,
          balance: parsedInfo.tokenAmount.uiAmount,
          decimals: parsedInfo.tokenAmount.decimals,
        };
      });

      return {
        sol: solBalance,
        tokens,
      };
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return {
        sol: 0,
        tokens: [],
      };
    }
  }

  /**
   * Update wallet information
   */
  async updateWallet(walletId: string, data: { name?: string; isActive?: boolean }) {
    return this.prisma.wallet.update({
      where: { id: walletId },
      data,
    });
  }

  /**
   * Delete wallet
   */
  async deleteWallet(walletId: string) {
    return this.prisma.wallet.delete({
      where: { id: walletId },
    });
  }
}


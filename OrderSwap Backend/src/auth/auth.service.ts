import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }


  async authenticateWallet(publicKey: string, signature: string, message: string) {
    try {


      const isValid = this.verifySignature(publicKey, signature, message);

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }

      let wallet = await this.prisma.wallet.findUnique({
        where: { publicKey },
        include: { user: true },
      });

      if (!wallet) {
        const user = await this.prisma.user.create({
          data: {
            wallets: {
              create: {
                publicKey,
                isActive: true,
              },
            },
          },
          include: {
            wallets: true,
          },
        });
        // Get the wallet with user relation
        wallet = await this.prisma.wallet.findUnique({
          where: { publicKey },
          include: { user: true },
        });
      }

      // Generate JWT token
      const payload = {
        sub: wallet.userId,
        walletId: wallet.id,
        publicKey: wallet.publicKey,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: wallet.userId,
          walletId: wallet.id,
          publicKey: wallet.publicKey,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Verify Solana wallet signature
   */
  private verifySignature(publicKey: string, signature: string, message: string): boolean {
    try {
      // console.log('🔍 Verifying signature...');
      // console.log('  Public key:', publicKey);
      // console.log('  Signature length:', signature.length);
      // console.log('  Message length:', message.length);

      const publicKeyBytes = new PublicKey(publicKey).toBytes();
      // console.log('  Public key bytes length:', publicKeyBytes.length);

      const signatureBytes = bs58.decode(signature);
      // console.log('  Signature bytes length:', signatureBytes.length);

      const messageBytes = new TextEncoder().encode(message);
      // console.log('  Message bytes length:', messageBytes.length);

      // Solana wallets use Ed25519 signatures
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      // console.log('  Verification result:', isValid);

      return isValid;
    } catch (error) {
      console.error('❌ Signature verification error:', error.message);
      console.error('   Stack:', error.stack);
      return false;
    }
  }

  /**
   * Generate authentication message for wallet to sign
   */
  generateAuthMessage(publicKey: string): string {
    const timestamp = Date.now();
    return `Sign this message to authenticate with OrderSwap.\n\nWallet: ${publicKey}\nTimestamp: ${timestamp}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
  }

  /**
   * Validate JWT token and return user
   */
  async validateUser(userId: string, walletId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          where: { id: walletId },
        },
      },
    });

    if (!user || user.wallets.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      walletId: user.wallets[0].id,
      publicKey: user.wallets[0].publicKey,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string, walletId: string) {
    const payload = {
      sub: userId,
      walletId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}


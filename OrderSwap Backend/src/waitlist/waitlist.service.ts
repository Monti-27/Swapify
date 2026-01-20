import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JoinWaitlistDto, VerifySocialDto } from './dto/waitlist.dto';

@Injectable()
export class WaitlistService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate a unique 6-character referral code (uppercase + numbers)
     */
    private generateReferralCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 to avoid confusion
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Generate a unique referral code that doesn't exist in DB
     */
    private async generateUniqueReferralCode(): Promise<string> {
        let code: string;
        let exists = true;
        let attempts = 0;
        const maxAttempts = 10;

        while (exists && attempts < maxAttempts) {
            code = this.generateReferralCode();
            const existing = await this.prisma.waitlistUser.findUnique({
                where: { referralCode: code },
            });
            exists = !!existing;
            attempts++;
        }

        if (exists) {
            throw new Error('Failed to generate unique referral code');
        }

        return code;
    }

    /**
     * Join the waitlist (Smart Recovery: returns existing user if found with matching credentials)
     */
    async joinWaitlist(dto: JoinWaitlistDto) {
        const { email, walletAddress, referredByCode } = dto;

        // Check if user exists with this email OR wallet
        const existingByEmail = await this.prisma.waitlistUser.findUnique({
            where: { email },
        });

        const existingByWallet = await this.prisma.waitlistUser.findUnique({
            where: { walletAddress },
        });

        // Smart Recovery Logic
        if (existingByEmail || existingByWallet) {
            const existingUser = existingByEmail || existingByWallet;

            // Check if BOTH email and wallet match the same record
            if (
                existingUser.email === email &&
                existingUser.walletAddress === walletAddress
            ) {
                // Match! Return existing user (acts as login)
                return {
                    user: existingUser,
                    isExisting: true,
                    message: 'Welcome back! Your account was recovered.',
                };
            }

            // Mismatch - different combinations
            if (existingByEmail && existingByEmail.walletAddress !== walletAddress) {
                throw new ConflictException(
                    'This email is already registered with a different wallet address.',
                );
            }

            if (existingByWallet && existingByWallet.email !== email) {
                throw new ConflictException(
                    'This wallet is already registered with a different email address.',
                );
            }
        }

        // New user - generate referral code
        const referralCode = await this.generateUniqueReferralCode();

        // Handle referral bonus in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // If referred by someone, give them +5 points
            if (referredByCode) {
                const referrer = await tx.waitlistUser.findUnique({
                    where: { referralCode: referredByCode },
                });

                if (referrer) {
                    await tx.waitlistUser.update({
                        where: { id: referrer.id },
                        data: { points: { increment: 5 } },
                    });
                }
            }

            // Create new waitlist user
            const newUser = await tx.waitlistUser.create({
                data: {
                    email,
                    walletAddress,
                    referralCode,
                    referredByCode: referredByCode || null,
                    points: 0,
                },
            });

            return newUser;
        });

        return {
            user: result,
            isExisting: false,
            message: 'Successfully joined the waitlist!',
        };
    }

    /**
     * Verify social task completion and award points
     */
    async verifySocial(dto: VerifySocialDto) {
        const { userId, platform } = dto;

        const user = await this.prisma.waitlistUser.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if already claimed
        if (platform === 'twitter' && user.followedTwitter) {
            throw new BadRequestException('You have already claimed this reward');
        }

        if (platform === 'telegram' && user.joinedTelegram) {
            throw new BadRequestException('You have already claimed this reward');
        }

        // Update flag and add points
        const updateData = platform === 'twitter'
            ? { followedTwitter: true, points: { increment: 3 } }
            : { joinedTelegram: true, points: { increment: 3 } };

        const updatedUser = await this.prisma.waitlistUser.update({
            where: { id: userId },
            data: updateData,
        });

        return {
            user: updatedUser,
            pointsAwarded: 3,
            message: `Thanks for ${platform === 'twitter' ? 'following us on X' : 'joining our Telegram'}!`,
        };
    }

    /**
     * Get waitlist user by email or wallet
     */
    async getUser(email?: string, walletAddress?: string) {
        if (!email && !walletAddress) {
            throw new BadRequestException('Please provide email or wallet address');
        }

        const user = await this.prisma.waitlistUser.findFirst({
            where: {
                OR: [
                    email ? { email } : undefined,
                    walletAddress ? { walletAddress } : undefined,
                ].filter(Boolean),
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return { user };
    }

    /**
     * Get leaderboard (top users by points)
     */
    async getLeaderboard(limit: number = 10) {
        const users = await this.prisma.waitlistUser.findMany({
            orderBy: { points: 'desc' },
            take: limit,
            select: {
                id: true,
                email: true,
                referralCode: true,
                points: true,
                createdAt: true,
            },
        });

        return { leaderboard: users };
    }

    /**
     * Get waitlist stats
     */
    async getStats() {
        const totalUsers = await this.prisma.waitlistUser.count();
        const totalPoints = await this.prisma.waitlistUser.aggregate({
            _sum: { points: true },
        });

        return {
            totalUsers,
            totalPoints: totalPoints._sum.points || 0,
        };
    }
}

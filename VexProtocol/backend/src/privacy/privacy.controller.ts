import {
    Body,
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Query,
    BadRequestException,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PrivacyService, RelayerSubmission, BackupNoteDto, RecordTransactionDto } from './privacy.service';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class RelayerSubmitDto {
    @IsString()
    transaction: string;

    @IsString()
    @IsOptional()
    proof?: string;
}

export class ScheduleTransferDto {
    @IsNumber()
    @Min(0.001)
    amount: number;

    @IsString()
    destination: string;

    @IsString()
    commitment: string;

    @IsString()
    userPublicKey: string;

    @IsString()
    @IsOptional()
    commitmentId?: string;
}

export class BackupNoteRequestDto {
    @IsString()
    walletAddress: string;

    @IsString()
    encryptedNote: string;

    @IsString()
    noteHash: string;

    @IsNumber()
    amount: number;
}

export class RecordTransactionRequestDto {
    @IsString()
    walletAddress: string;

    @IsString()
    type: 'shield' | 'unshield';

    @IsNumber()
    amount: number;

    @IsString()
    @IsOptional()
    txSignature?: string;

    @IsString()
    @IsOptional()
    destinationAddress?: string;

    @IsString()
    @IsOptional()
    commitmentId?: string;
}

@Controller('privacy')
export class PrivacyController {
    constructor(private readonly privacyService: PrivacyService) { }

    @Post('relayer/submit')
    @HttpCode(HttpStatus.OK)
    async submitToRelayer(@Body() body: RelayerSubmitDto) {
        if (!body.transaction) {
            throw new BadRequestException('Transaction data is required');
        }

        return this.privacyService.submitWithRelayer({
            transaction: body.transaction,
            proof: body.proof || '{}',
        });
    }

    @Post('backup')
    async backupNote(@Body() body: BackupNoteRequestDto) {
        return this.privacyService.backupNote(body);
    }

    @Get('backup')
    async getBackedUpNotes(@Query('wallet') wallet: string) {
        if (!wallet) {
            throw new BadRequestException('Wallet address is required');
        }

        const notes = await this.privacyService.getBackedUpNotes(wallet);
        return { count: notes.length, notes };
    }

    @Post('transaction')
    async recordTransaction(@Body() body: RecordTransactionRequestDto) {
        return this.privacyService.recordTransaction(body);
    }

    @Get('transactions')
    async getTransactionHistory(@Query('wallet') wallet: string) {
        if (!wallet) {
            throw new BadRequestException('Wallet address is required');
        }

        const transactions = await this.privacyService.getTransactionHistory(wallet);
        return { count: transactions.length, transactions };
    }

    @Post('transfer/schedule')
    async scheduleTransfer(@Body() body: ScheduleTransferDto) {
        if (!body.amount || body.amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        if (!body.destination) {
            throw new BadRequestException('Destination address is required');
        }

        if (!body.commitment) {
            throw new BadRequestException('Commitment note is required');
        }

        if (!body.userPublicKey) {
            throw new BadRequestException('User public key is required');
        }

        const result = await this.privacyService.scheduleRandomizedTransfer(
            body.amount,
            body.destination,
            body.commitment,
            body.userPublicKey,
            body.commitmentId,
        );

        return {
            success: true,
            message: `Scheduled ${result.chunks.length} chunks for transfer`,
            jobIds: result.jobIds,
            chunks: result.chunks,
            estimatedDelays: result.delays.map(d => ({
                ms: d,
                human: this.formatDelay(d),
            })),
        };
    }

    @Get('jobs')
    async getPendingJobs(@Query('wallet') wallet?: string) {
        if (wallet) {
            const jobs = await this.privacyService.getUserPendingJobs(wallet);
            return { count: jobs.length, jobs };
        }

        const jobs = await this.privacyService.getPendingJobs();
        return { count: jobs.length, jobs };
    }

    @Delete('jobs/:jobId')
    @HttpCode(HttpStatus.OK)
    async cancelJob(@Param('jobId') jobId: string) {
        const cancelled = await this.privacyService.cancelJob(jobId);

        if (!cancelled) {
            throw new BadRequestException('Job not found or already processed');
        }

        return { success: true, message: `Job ${jobId} cancelled` };
    }

    private formatDelay(ms: number): string {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

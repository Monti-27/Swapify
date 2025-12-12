import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private prisma: PrismaService) {}

  log(message: string, context?: string) {
    console.log(`[${context || 'Application'}] ${message}`);
    this.saveLog('info', 'system', message);
  }

  error(message: string, trace?: string, context?: string) {
    console.error(`[${context || 'Application'}] ${message}`, trace);
    this.saveLog('error', 'system', message, { trace });
  }

  warn(message: string, context?: string) {
    console.warn(`[${context || 'Application'}] ${message}`);
    this.saveLog('warning', 'system', message);
  }

  debug(message: string, context?: string) {
    console.debug(`[${context || 'Application'}] ${message}`);
  }

  verbose(message: string, context?: string) {
    console.log(`[${context || 'Application'}] ${message}`);
  }

  private async saveLog(level: string, service: string, message: string, data?: any) {
    try {
      await this.prisma.systemLog.create({
        data: {
          level,
          service,
          message,
          data: data || {},
        },
      });
    } catch (error) {
      // Don't throw if logging fails
      console.error('Failed to save log:', error);
    }
  }
}


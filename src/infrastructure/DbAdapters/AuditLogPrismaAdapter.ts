import { getPrismaClient } from '../../config/PrismaClient';
import { IAuditLogDataSource, AuditLogFilters } from '../../domain/interfaces/IAuditLogDataSource';
import { AuditLog, AuditLogEntry } from '../../domain/entities/AuditLog';
import { Prisma } from '@prisma/client';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class AuditLogPrismaAdapter implements IAuditLogDataSource {
  private readonly prisma = getPrismaClient();

  public async create(entry: AuditLogEntry): Promise<AuditLog> {
    const created = await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        tableName: entry.tableName,
        entityId: entry.entityId ?? null,
        userId: entry.actor?.userId ?? null,
        username: entry.actor?.username ?? null,
        status: entry.status ?? 'SUCCESS',
        ipAddress: entry.actor?.ipAddress ?? null,
        userAgent: entry.actor?.userAgent ?? null,
        data: entry.data !== undefined && entry.data !== null ? (entry.data as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return created as unknown as AuditLog;
  }

  public async getAll(filters: AuditLogFilters = {}): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.action) where.action = filters.action;
    if (filters.tableName) where.tableName = filters.tableName;
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;

    if (filters.startDate || filters.endDate) {
      const occurredAt: Prisma.DateTimeFilter = {};
      if (filters.startDate) occurredAt.gte = new Date(filters.startDate);
      if (filters.endDate) occurredAt.lte = new Date(filters.endDate);
      where.occurredAt = occurredAt;
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, MAX_LIMIT) : DEFAULT_LIMIT;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs as unknown as AuditLog[],
      total,
    };
  }
}

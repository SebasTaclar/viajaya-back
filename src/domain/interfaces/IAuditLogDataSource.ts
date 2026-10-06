import { AuditLog, AuditLogEntry } from '../entities/AuditLog';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  tableName?: string;
  status?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

export interface IAuditLogDataSource {
  create(entry: AuditLogEntry): Promise<AuditLog>;
  getAll(filters?: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number }>;
}

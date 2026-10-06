import { Logger } from '../../shared/Logger';
import { IAuditLogDataSource, AuditLogFilters } from '../../domain/interfaces/IAuditLogDataSource';
import { AuditLog, AuditLogEntry } from '../../domain/entities/AuditLog';

export class AuditService {
  private logger: Logger;
  private auditDataSource: IAuditLogDataSource;

  constructor(logger: Logger, auditDataSource: IAuditLogDataSource) {
    this.logger = logger;
    this.auditDataSource = auditDataSource;
  }

  /**
   * Records an audit entry. Never throws: auditing must not break the business flow.
   */
  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await this.auditDataSource.create(entry);
    } catch (error) {
      this.logger.logError(`Failed to record audit log for ${entry.action} on ${entry.tableName}`, error);
    }
  }

  async getAll(filters?: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number }> {
    return this.auditDataSource.getAll(filters);
  }
}

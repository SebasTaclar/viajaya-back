import { Logger } from '../../shared/Logger';

interface PendingBalanceReminderError {
  clientId: number;
  email?: string;
  error: string;
}

export class PendingBalanceReminderService {
  private logger: Logger;

  constructor(_prisma: unknown, logger: Logger) {
    this.logger = logger;
  }

  async sendPendingBalanceReminders(): Promise<{
    sent: number;
    skipped: number;
    errors: PendingBalanceReminderError[];
  }> {
    this.logger.logInfo('PendingBalanceReminderService: stub - billing fields removed in CRM migration');
    return { sent: 0, skipped: 0, errors: [] };
  }
}

export default PendingBalanceReminderService;

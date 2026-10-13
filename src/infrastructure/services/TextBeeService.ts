import axios from 'axios';
import { Logger } from '../../shared/Logger';
import { AppError, ValidationError } from '../../shared/exceptions';

const TIMEOUT_MS = 15000;

export interface SendSmsResult {
  success: boolean;
  recipients: string[];
  response: unknown;
}

export interface TextBeeSubscriptionUsage {
  processedSmsToday: number;
  processedSmsLastMonth: number;
  monthlyPeriodStart: string;
  monthlyResetAt: string;
  dailyLimit: number;
  monthlyLimit: number;
  bulkSendLimit: number;
  deviceLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  dailyUsagePercentage: number;
  monthlyUsagePercentage: number;
}

export class TextBeeService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private getBaseUrl(): string {
    const baseUrl = process.env.TEXTBEE_BASE_URL;
    if (!baseUrl) {
      throw new AppError('TEXTBEE_BASE_URL is not configured', 500);
    }
    return baseUrl.replace(/\/$/, '');
  }

  private getApiKey(): string {
    const apiKey = process.env.TEXTBEE_API_KEY;
    if (!apiKey) {
      throw new AppError('TEXTBEE_API_KEY is not configured', 500);
    }
    return apiKey;
  }

  async sendSms(recipients: string[], message: string): Promise<SendSmsResult> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!deviceId) {
      throw new AppError('TEXTBEE_DEVICE_ID is not configured', 500);
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new ValidationError('At least one recipient is required');
    }
    if (!message || !message.trim()) {
      throw new ValidationError('message is required');
    }

    this.logger.info(`Sending SMS to ${recipients.length} recipient(s)`);

    try {
      const response = await axios.post(
        `${baseUrl}/gateway/send-sms`,
        { deviceId, recipients, message },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: TIMEOUT_MS,
        }
      );

      this.logger.info(`SMS sent successfully (${response.status})`);
      return {
        success: true,
        recipients,
        response: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 502;
        const detail =
          (error.response?.data as Record<string, unknown> | undefined)?.message ||
          error.message;
        this.logger.logError(`TextBee request failed: ${detail}`);
        throw new AppError(`TextBee request failed: ${detail}`, status);
      }
      throw error;
    }
  }

  async getSubscriptionUsage(): Promise<TextBeeSubscriptionUsage> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();

    this.logger.info('Fetching TextBee subscription usage');

    try {
      const response = await axios.get(`${baseUrl}/billing/current-subscription`, {
        headers: {
          'x-api-key': apiKey,
        },
        timeout: TIMEOUT_MS,
      });

      const usage = (response.data as { usage?: TextBeeSubscriptionUsage }).usage;
      if (!usage) {
        throw new AppError('TextBee subscription usage not available', 502);
      }

      this.logger.info('TextBee subscription usage retrieved');
      return usage;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 502;
        const detail =
          (error.response?.data as Record<string, unknown> | undefined)?.message ||
          error.message;
        this.logger.logError(`TextBee subscription request failed: ${detail}`);
        throw new AppError(`TextBee request failed: ${detail}`, status);
      }
      throw error;
    }
  }
}

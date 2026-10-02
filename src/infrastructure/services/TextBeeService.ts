import axios from 'axios';
import { Logger } from '../../shared/Logger';
import { AppError, ValidationError } from '../../shared/exceptions';

const TEXTBEE_SEND_URL = 'https://api.textbee.dev/api/v1/gateway/send-sms';
const TIMEOUT_MS = 15000;

export interface SendSmsResult {
  success: boolean;
  recipients: string[];
  response: unknown;
}

export class TextBeeService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async sendSms(recipients: string[], message: string): Promise<SendSmsResult> {
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!apiKey) {
      throw new AppError('TEXTBEE_API_KEY is not configured', 500);
    }
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
        TEXTBEE_SEND_URL,
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
}

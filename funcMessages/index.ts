import { Context, HttpRequest } from '@azure/functions';
import { getTextBeeService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { withRole } from '../src/shared/roleMiddleware';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { ValidationError } from '../src/shared/exceptions';

function normalizeRecipients(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
  }

  if (Array.isArray(raw)) {
    return raw
      .map((r) => String(r).trim())
      .filter((r) => r.length > 0);
  }

  return [];
}

const funcMessages = async (
  _context: Context,
  req: HttpRequest,
  logger: Logger
): Promise<unknown> => {
  const body = req.body as Record<string, unknown>;
  const recipients = normalizeRecipients(body.recipients);
  const message = body.message as string;

  if (recipients.length === 0) {
    throw new ValidationError('recipients is required (string or array of numbers)');
  }
  if (!message || !message.trim()) {
    throw new ValidationError('message is required');
  }

  const textBeeService = getTextBeeService(logger);
  const result = await textBeeService.sendSms(recipients, message);

  return ApiResponseBuilder.success(result, 'SMS sent successfully');
};

export default withAuthenticatedApiHandler(withRole(['superadmin', 'admin'], funcMessages));

import { Context, HttpRequest } from '@azure/functions';
import { getTextBeeService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { withRole } from '../src/shared/roleMiddleware';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';

const funcTextMessagesStats = async (
  _context: Context,
  _req: HttpRequest,
  logger: Logger
): Promise<unknown> => {
  const textBeeService = getTextBeeService(logger);
  const usage = await textBeeService.getSubscriptionUsage();

  return ApiResponseBuilder.success(usage, 'SMS usage retrieved');
};

export default withAuthenticatedApiHandler(withRole(['superadmin', 'admin'], funcTextMessagesStats));

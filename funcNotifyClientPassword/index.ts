import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getAuthService, getPasswordNotifierService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { withRole } from '../src/shared/roleMiddleware';
import { AuthenticatedUser } from '../src/shared/authMiddleware';

const funcNotifyClientPassword = async (
  _context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const clientId = parseInt(req.params.id, 10);
  if (isNaN(clientId)) {
    return ApiResponseBuilder.badRequest('Invalid client ID');
  }

  const authService = getAuthService(log);
  const notifier = getPasswordNotifierService(log);
  await authService.notifyClientPassword(clientId, user, notifier);

  return ApiResponseBuilder.success(null, 'New password sent to the client by SMS');
};

export default withAuthenticatedApiHandler(withRole(['superadmin', 'admin'], funcNotifyClientPassword));

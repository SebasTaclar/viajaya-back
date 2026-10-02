import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getAuthService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { withRole } from '../src/shared/roleMiddleware';
import { AuthenticatedUser } from '../src/shared/authMiddleware';

const funcCreateUser = async (
  _context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const authService = getAuthService(log);
  const userInfo = await authService.createUser(req.body, user);
  return ApiResponseBuilder.success(userInfo, 'User created successfully');
};

export default withAuthenticatedApiHandler(withRole(['superadmin', 'admin'], funcCreateUser));

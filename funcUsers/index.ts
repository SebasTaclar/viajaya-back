import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getAuthService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { withRole } from '../src/shared/roleMiddleware';
import { AuthenticatedUser } from '../src/shared/authMiddleware';

const funcUsers = async (
  _context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const method = req.method?.toUpperCase();

  if (method === 'GET') {
    const authService = getAuthService(log);
    const users = await authService.getAllUsers(user);
    return ApiResponseBuilder.success(users, 'Users retrieved successfully');
  }

  if (method === 'DELETE') {
    const id = req.params?.id;
    if (!id) {
      return ApiResponseBuilder.badRequest('User ID is required');
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return ApiResponseBuilder.badRequest('Invalid user ID');
    }

    const authService = getAuthService(log);
    await authService.deleteUser(id, user);
    return ApiResponseBuilder.success({ id: numericId }, 'User deleted successfully');
  }

  return ApiResponseBuilder.methodNotAllowed(`Method ${method} not allowed for this endpoint`);
};

export default withAuthenticatedApiHandler(withRole(['superadmin', 'admin'], funcUsers));

import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { withRole, isAdmin, isSuperAdmin } from '../src/shared/roleMiddleware';
import { AuthenticatedUser } from '../src/shared/authMiddleware';
import { getPrismaClient } from '../src/config/PrismaClient';

const funcAssignClient = async (
  _context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  if (!isAdmin(user) && !isSuperAdmin(user)) {
    return ApiResponseBuilder.error('Forbidden: Only admins can assign clients to users', 403);
  }

  const clientId = parseInt(req.params.id, 10);
  if (isNaN(clientId)) {
    return ApiResponseBuilder.badRequest('Invalid client ID');
  }

  const body = req.body as Record<string, unknown>;
  const userId = body.userId as number | null;

  if (userId !== null && (typeof userId !== 'number' || isNaN(userId))) {
    return ApiResponseBuilder.badRequest('userId must be a valid number or null');
  }

  const prisma = getPrismaClient();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return ApiResponseBuilder.error('Client not found', 404);
  }

  if (userId !== null) {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return ApiResponseBuilder.error('User not found', 404);
    }
  }

  const updatedClient = await prisma.client.update({
    where: { id: clientId },
    data: { userId: userId },
  });

  log.logInfo(`Client ${clientId} assigned to user ${userId} by admin ${user.email}`);
  return ApiResponseBuilder.success(updatedClient, 'Client assigned to user successfully');
};

export default withAuthenticatedApiHandler(withRole(['superadmin', 'admin'], funcAssignClient));

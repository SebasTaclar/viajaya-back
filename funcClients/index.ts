import { Context, HttpRequest } from '@azure/functions';
import { getClientService } from '../src/shared/serviceProvider';
import { ClientRequest, UpdateClientRequest } from '../src/application/services/ClientService';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { AuthenticatedUser } from '../src/shared/authMiddleware';
import { isAdmin, isClient, isSuperAdmin } from '../src/shared/roleMiddleware';
import { buildAuditActor } from '../src/shared/auditContext';

const canManageClients = (user: AuthenticatedUser): boolean =>
  isAdmin(user) || isSuperAdmin(user);

const funcClients = async (
  _context: Context,
  req: HttpRequest,
  logger: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const clientService = getClientService(logger);
  const method = req.method?.toUpperCase();
  const id = req.params.id ? parseInt(req.params.id, 10) : null;
  const actor = buildAuditActor(user, req);

  if (method === 'GET' && !id) {
    logger.info('GET /clients - Fetching clients');
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const search = req.query.search as string | undefined;

    let result;

    if (isClient(user)) {
      const userClients = await clientService.getClientsByUserId(parseInt(user.id, 10));
      result = { clients: userClients, total: userClients.length };
    } else if (search) {
      result = await clientService.searchClients(search, page || 1, limit || 10);
    } else if (page || limit) {
      result = await clientService.getAllClients(page || 1, limit || 10);
    } else {
      result = await clientService.getAllClients();
    }

    const effectiveLimit = limit || result.total;
    const effectivePage = page || 1;
    const totalPages = Math.ceil(result.total / effectiveLimit);

    return ApiResponseBuilder.success(
      {
        count: result.clients.length,
        clients: result.clients,
        pagination: limit || page ? {
          page: effectivePage,
          limit: effectiveLimit,
          total: result.total,
          totalPages,
          hasNext: effectivePage < totalPages,
          hasPrevious: effectivePage > 1,
        } : undefined,
      },
      search ? `Clients found matching "${search}"` : 'Clients retrieved successfully'
    );
  }

  if (method === 'GET' && id) {
    logger.info(`GET /clients/${id} - Fetching client by ID`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid client ID');
    const client = await clientService.getClientById(id);

    if (isClient(user) && client.userId !== parseInt(user.id, 10)) {
      return ApiResponseBuilder.error('Forbidden: You can only view your own data', 403);
    }

    return ApiResponseBuilder.success(client, 'Client retrieved successfully');
  }

  if (method === 'POST') {
    logger.info('POST /clients - Creating new client');
    if (!canManageClients(user)) {
      return ApiResponseBuilder.error('Forbidden: Only admins can create clients', 403);
    }

    const body = req.body as Record<string, unknown>;

    const clientRequest: ClientRequest = {
      name: body.name as string,
      cedula: body.cedula as string,
      phone: body.phone as string,
      periodicidad: body.periodicidad as string,
      ubicacion: body.ubicacion as string,
      email: body.email as string,
      password: body.password as string,
    };

    const client = await clientService.createClient(clientRequest, actor);
    return { success: true, message: 'Client created successfully', data: client, timestamp: new Date().toISOString(), statusCode: 201 };
  }

  if (method === 'PATCH' && id) {
    logger.info(`PATCH /clients/${id} - Updating client`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid client ID');
    if (!canManageClients(user)) {
      return ApiResponseBuilder.error('Forbidden: Only admins can update clients', 403);
    }

    const body = req.body as Record<string, unknown>;
    const updateRequest: UpdateClientRequest = {
      name: body.name as string,
      cedula: body.cedula as string,
      phone: body.phone as string,
      periodicidad: body.periodicidad as string,
      ubicacion: body.ubicacion as string,
      email: body.email as string,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      password: body.password as string,
    };

    const client = await clientService.updateClient(id, updateRequest, actor);
    return ApiResponseBuilder.success(client, 'Client updated successfully');
  }

  if (method === 'DELETE' && id) {
    logger.info(`DELETE /clients/${id} - Deleting client`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid client ID');
    if (!canManageClients(user)) {
      return ApiResponseBuilder.error('Forbidden: Only admins can delete clients', 403);
    }

    await clientService.deleteClient(id, actor);
    return ApiResponseBuilder.success({ id }, 'Client deleted successfully');
  }

  return ApiResponseBuilder.methodNotAllowed(`Method ${method} not allowed for this endpoint`);
};

export default withAuthenticatedApiHandler(funcClients);

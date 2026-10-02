import { Context, HttpRequest } from '@azure/functions';
import { getRecaudoService } from '../src/shared/serviceProvider';
import { RecaudoRequest, UpdateRecaudoRequest } from '../src/application/services/RecaudoService';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { AuthenticatedUser } from '../src/shared/authMiddleware';
import { isAdmin, isClient, isSuperAdmin } from '../src/shared/roleMiddleware';

const canManageRecaudos = (user: AuthenticatedUser): boolean =>
  isAdmin(user) || isSuperAdmin(user);

const funcRecaudos = async (
  _context: Context,
  req: HttpRequest,
  logger: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const recaudoService = getRecaudoService(logger);
  const method = req.method?.toUpperCase();
  const id = req.params.id ? parseInt(req.params.id, 10) : null;

  if (method === 'GET' && !id) {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const queryClientId = req.query.clientId ? parseInt(req.query.clientId as string, 10) : undefined;

    let result;

    if (isClient(user)) {
      result = await recaudoService.getRecaudosByUserId(parseInt(user.id, 10), page, limit);
    } else {
      result = await recaudoService.getAllRecaudos(page, limit, queryClientId);
    }

    const effectiveLimit = limit || result.total;
    const effectivePage = page || 1;
    const totalPages = Math.ceil(result.total / effectiveLimit);

    return ApiResponseBuilder.success(
      {
        count: result.recaudos.length,
        recaudos: result.recaudos,
        pagination: limit || page ? {
          page: effectivePage,
          limit: effectiveLimit,
          total: result.total,
          totalPages,
          hasNext: effectivePage < totalPages,
          hasPrevious: effectivePage > 1,
        } : undefined,
      },
      'Recaudos retrieved successfully'
    );
  }

  if (method === 'GET' && id) {
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid recaudo ID');
    const recaudo = await recaudoService.getRecaudoById(id);

    if (isClient(user)) {
      const ownClientId = await recaudoService.getOwnClientId(parseInt(user.id, 10));
      if (!ownClientId || recaudo.clientId !== ownClientId) {
        return ApiResponseBuilder.error('Forbidden: You can only view your own recaudos', 403);
      }
    }

    return ApiResponseBuilder.success(recaudo, 'Recaudo retrieved successfully');
  }

  if (method === 'POST') {
    logger.info('POST /recaudos - Creating new recaudo');
    if (!canManageRecaudos(user)) {
      return ApiResponseBuilder.error('Forbidden: Only admins can create recaudos', 403);
    }

    const body = req.body as Record<string, unknown>;
    const recaudoRequest: RecaudoRequest = {
      clientId: parseInt(body.clientId as string, 10),
      fecha: body.fecha as string,
      valor: body.valor !== undefined ? Number(body.valor) : (undefined as unknown as number),
    };

    const recaudo = await recaudoService.createRecaudo(recaudoRequest);
    return { success: true, message: 'Recaudo created successfully', data: recaudo, timestamp: new Date().toISOString(), statusCode: 201 };
  }

  if (method === 'PATCH' && id) {
    logger.info(`PATCH /recaudos/${id} - Updating recaudo`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid recaudo ID');
    if (!canManageRecaudos(user)) {
      return ApiResponseBuilder.error('Forbidden: Only admins can update recaudos', 403);
    }

    const body = req.body as Record<string, unknown>;
    const updateRequest: UpdateRecaudoRequest = {
      fecha: body.fecha as string,
      valor: body.valor !== undefined ? Number(body.valor) : undefined,
    };

    const recaudo = await recaudoService.updateRecaudo(id, updateRequest);
    return ApiResponseBuilder.success(recaudo, 'Recaudo updated successfully');
  }

  if (method === 'DELETE' && id) {
    logger.info(`DELETE /recaudos/${id} - Deleting recaudo`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid recaudo ID');
    if (!canManageRecaudos(user)) {
      return ApiResponseBuilder.error('Forbidden: Only admins can delete recaudos', 403);
    }

    await recaudoService.deleteRecaudo(id);
    return ApiResponseBuilder.success({ id }, 'Recaudo deleted successfully');
  }

  return ApiResponseBuilder.methodNotAllowed(`Method ${method} not allowed for this endpoint`);
};

export default withAuthenticatedApiHandler(funcRecaudos);

import { Context, HttpRequest } from '@azure/functions';
import { Logger } from './Logger';
import { validateAuthToken } from './authHelper';
import { ApiResponseBuilder } from './ApiResponse';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  name: string;
  role: string;
  membershipPaid: boolean;
}

export type HandlerWithAuth = (
  context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
) => Promise<unknown>;

export type HandlerWithoutAuth = (
  context: Context,
  req: HttpRequest,
  log: Logger
) => Promise<unknown>;

/**
 * Middleware de autenticación que valida el token JWT
 * y extrae la información del usuario autenticado.
 * Solo maneja errores de autenticación; los errores del handler
 * se propagan a withErrorHandler (404/409/400 reales).
 */
export const withAuth = (handler: HandlerWithAuth) => {
  return async (context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
    let authenticatedUser: AuthenticatedUser;

    try {
      // Obtener el header de autorización
      const authHeader = req.headers.authorization || req.headers.Authorization;

      if (!authHeader) {
        log.logError('Authentication failed: Missing authorization header');
        return ApiResponseBuilder.error('Unauthorized: Missing authorization header', 401);
      }

      // Validar y extraer el token
      const token = validateAuthToken(authHeader);

      // Verificar el token y extraer la información del usuario
      const { verifyToken } = await import('./jwtHelper');
      const userPayload = verifyToken(token);

      authenticatedUser = {
        id: userPayload.id,
        email: userPayload.email,
        name: userPayload.name,
        role: userPayload.role,
        membershipPaid: userPayload.membershipPaid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      log.logError(`Authentication failed: ${errorMessage}`);

      if (
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('invalid token') ||
        errorMessage.toLowerCase().includes('token has expired') ||
        errorMessage.toLowerCase().includes('token is required')
      ) {
        return ApiResponseBuilder.error('Unauthorized: Invalid or expired token', 401);
      }

      return ApiResponseBuilder.error(`Error: ${errorMessage}`, 500);
    }

    log.logInfo(`User authenticated successfully: ${authenticatedUser.email ?? authenticatedUser.name}`);

    // Llamar al handler fuera del try/catch: sus errores van a withErrorHandler
    return await handler(context, req, log, authenticatedUser);
  };
};

/**
 * Middleware que permite endpoints públicos (sin autenticación)
 */
export const withoutAuth = (handler: HandlerWithoutAuth) => {
  return async (context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
    return await handler(context, req, log);
  };
};

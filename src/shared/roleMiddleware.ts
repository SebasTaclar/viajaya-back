import { Context, HttpRequest } from '@azure/functions';
import { Logger } from './Logger';
import { AuthenticatedUser } from './authMiddleware';
import { ApiResponseBuilder } from './ApiResponse';
import { USER_ROLES } from './UserRoles';

export type HandlerWithRole = (
  context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
) => Promise<unknown>;

/**
 * Middleware que verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse después de withAuth.
 */
export const withRole = (allowedRoles: string[], handler: HandlerWithRole) => {
  return async (
    context: Context,
    req: HttpRequest,
    log: Logger,
    user: AuthenticatedUser
  ): Promise<unknown> => {
    if (!allowedRoles.includes(user.role)) {
      log.logError(
        `Authorization failed: User ${user.email} with role '${user.role}' is not allowed. Required: ${allowedRoles.join(', ')}`
      );
      return ApiResponseBuilder.error(
        'Forbidden: You do not have permission to perform this action',
        403
      );
    }

    return await handler(context, req, log, user);
  };
};

/**
 * Verifica si el usuario tiene rol superadmin
 */
export const isSuperAdmin = (user: AuthenticatedUser): boolean => {
  return user.role === USER_ROLES.SUPERADMIN;
};

/**
 * Verifica si el usuario tiene rol admin
 */
export const isAdmin = (user: AuthenticatedUser): boolean => {
  return user.role === USER_ROLES.ADMIN;
};

/**
 * Verifica si el usuario tiene rol client/user
 */
export const isClient = (user: AuthenticatedUser): boolean => {
  return user.role === USER_ROLES.USER;
};

/**
 * Verifica si el usuario puede modificar el password de un usuario target.
 * - superadmin puede modificar a cualquiera
 * - admin solo puede modificar su propio password y el de users normales
 * - user no puede modificar a nadie
 */
export const canChangePassword = (requester: AuthenticatedUser, targetRole: string, isSelf: boolean): boolean => {
  if (isSuperAdmin(requester)) return true;
  if (isAdmin(requester)) return isSelf || targetRole === USER_ROLES.USER;
  return false;
};

/**
 * Verifica si el usuario puede eliminar a un usuario target.
 * - superadmin puede eliminar a cualquiera
 * - admin solo puede eliminar users normales
 * - no puede eliminarse a sí mismo
 */
export const canDeleteUser = (requester: AuthenticatedUser, targetRole: string, isSelf: boolean): boolean => {
  if (isSelf) return false;
  if (isSuperAdmin(requester)) return true;
  if (isAdmin(requester)) return targetRole === USER_ROLES.USER;
  return false;
};

/**
 * Verifica si el usuario puede crear un usuario con el rol especificado.
 * - superadmin puede crear cualquier rol
 * - admin solo puede crear users normales
 */
export const canCreateUserWithRole = (requester: AuthenticatedUser, targetRole: string): boolean => {
  if (isSuperAdmin(requester)) return true;
  if (isAdmin(requester)) return targetRole === USER_ROLES.USER;
  return false;
};

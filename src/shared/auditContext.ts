import { HttpRequest } from '@azure/functions';
import { AuditActor } from '../domain/entities/AuditLog';
import { AuthenticatedUser } from './authMiddleware';

export const getClientIp = (req: HttpRequest): string | null => {
  const forwarded = req.headers?.['x-forwarded-for'] as string | undefined;
  const clientIp = req.headers?.['x-client-ip'] as string | undefined;
  const raw = forwarded || clientIp;
  if (!raw) return null;
  return raw.split(',')[0].trim() || null;
};

export const getUserAgent = (req: HttpRequest): string | null =>
  (req.headers?.['user-agent'] as string | undefined) || null;

export const getRequestContext = (req: HttpRequest): { ipAddress: string | null; userAgent: string | null } => ({
  ipAddress: getClientIp(req),
  userAgent: getUserAgent(req),
});

/**
 * Builds the audit actor (who did it + request metadata) from the authenticated user.
 */
export const buildAuditActor = (user: AuthenticatedUser, req: HttpRequest): AuditActor => ({
  userId: parseInt(user.id, 10) || null,
  username: user.email ?? null,
  ipAddress: getClientIp(req),
  userAgent: getUserAgent(req),
});

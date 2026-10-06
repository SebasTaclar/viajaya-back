export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGIN_CLIENT: 'LOGIN_CLIENT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
} as const;

export type AuditStatus = (typeof AUDIT_STATUS)[keyof typeof AUDIT_STATUS];

export const AUDIT_TABLES = {
  USERS: 'users',
  CLIENTS: 'clients',
  RECAUDOS: 'recaudos',
} as const;

export type AuditTable = (typeof AUDIT_TABLES)[keyof typeof AUDIT_TABLES];

export const AUDIT_LOGIN_REASONS = {
  MISSING_CREDENTIALS: 'missing_credentials',
  USER_NOT_FOUND: 'user_not_found',
  INVALID_PASSWORD: 'invalid_password',
  CLIENT_NOT_FOUND: 'client_not_found',
} as const;

export type AuditLoginReason = (typeof AUDIT_LOGIN_REASONS)[keyof typeof AUDIT_LOGIN_REASONS];

export interface AuditActor {
  userId?: number | null;
  username?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditRequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type AuditData = Record<string, unknown>;

export type AuditLog = {
  id: number;
  occurredAt: Date;
  action: string;
  tableName: string;
  entityId?: number | null;
  userId?: number | null;
  username?: string | null;
  status: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  data?: AuditData | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AuditLogEntry = {
  action: AuditAction;
  tableName: AuditTable;
  entityId?: number | null;
  actor?: AuditActor;
  status?: AuditStatus;
  data?: AuditData | null;
};

const toPlainValue = (value: unknown, omit: string[]): unknown => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map((item) => toPlainValue(item, omit));
  if (typeof value === 'object') {
    const candidate = value as { toNumber?: () => number };
    if (typeof candidate.toNumber === 'function') return candidate.toNumber();
    const nested: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (omit.includes(key)) continue;
      nested[key] = toPlainValue(entry, omit);
    }
    return nested;
  }
  return value;
};

/**
 * Builds a JSON-safe snapshot of a record.
 * Sensitive fields (password) are always excluded and dates/decimals are serialized.
 */
export function auditSnapshot<T extends object>(record: T, omit: string[] = ['password']): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (omit.includes(key) || value === undefined) continue;
    snapshot[key] = toPlainValue(value, omit);
  }

  return snapshot;
}

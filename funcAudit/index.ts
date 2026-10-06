import { Context, HttpRequest } from '@azure/functions';
import { getAuditService } from '../src/shared/serviceProvider';
import { AuditLogFilters } from '../src/domain/interfaces/IAuditLogDataSource';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { withRole } from '../src/shared/roleMiddleware';

const parsePositiveInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseInt(value as string, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
};

const funcAudit = async (
  _context: Context,
  req: HttpRequest,
  logger: Logger
): Promise<unknown> => {
  logger.info('GET /audit - Fetching audit logs');
  const auditService = getAuditService(logger);

  const page = parsePositiveInt(req.query.page) ?? 1;
  const limit = parsePositiveInt(req.query.limit) ?? 20;

  const filters: AuditLogFilters = {
    page,
    limit,
    action: req.query.action as string | undefined,
    tableName: req.query.tableName as string | undefined,
    status: req.query.status as string | undefined,
    userId: parsePositiveInt(req.query.userId),
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const result = await auditService.getAll(filters);
  const totalPages = Math.ceil(result.total / limit);

  return ApiResponseBuilder.success(
    {
      count: result.logs.length,
      logs: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    },
    'Audit logs retrieved successfully'
  );
};

export default withAuthenticatedApiHandler(withRole(['superadmin'], funcAudit));

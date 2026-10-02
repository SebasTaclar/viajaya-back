import { Context, HttpRequest } from '@azure/functions';
import { getDashboardService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { withRole } from '../src/shared/roleMiddleware';

const funcDashboard = async (
  _context: Context,
  _req: HttpRequest,
  logger: Logger
): Promise<unknown> => {
  logger.info('GET /dashboard - Building KPIs');
  const dashboardService = getDashboardService(logger);
  const dashboard = await dashboardService.getDashboard();
  return ApiResponseBuilder.success(dashboard, 'Dashboard retrieved successfully');
};

export default withAuthenticatedApiHandler(withRole(['superadmin'], funcDashboard));

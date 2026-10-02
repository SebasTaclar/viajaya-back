import { Context, HttpRequest } from '@azure/functions';
import { getEventService } from '../src/shared/serviceProvider';
import { EventRequest, UpdateEventRequest } from '../src/domain/entities/Event';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { AuthenticatedUser } from '../src/shared/authMiddleware';
import { isClient } from '../src/shared/roleMiddleware';

const funcEvents = async (
  _context: Context,
  req: HttpRequest,
  logger: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const eventService = getEventService(logger);
  const method = req.method?.toUpperCase();
  const id = req.params.id ? parseInt(req.params.id, 10) : null;
  const entityType = req.query.entityType as string | undefined;
  const entityId = req.query.entityId ? parseInt(req.query.entityId as string, 10) : null;

  if (method === 'GET' && !id && entityType && entityId) {
    logger.info(`GET /events?entityType=${entityType}&entityId=${entityId}`);
    let events = await eventService.getEventsByEntity(entityType, entityId);

    if (isClient(user)) {
      events = events.filter(e => e.isVisible);
    }

    return ApiResponseBuilder.success({ count: events.length, events }, 'Events retrieved successfully');
  }

  if (method === 'GET' && !id) {
    logger.info('GET /events - Fetching all events');
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await eventService.getAllEvents(page, limit);

    if (isClient(user)) {
      result.events = result.events.filter(e => e.isVisible);
    }

    const totalPages = Math.ceil(result.total / limit);
    return ApiResponseBuilder.success(
      {
        count: result.events.length,
        events: result.events,
        pagination: { page, limit, total: result.total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
      },
      'Events retrieved successfully'
    );
  }

  if (method === 'POST') {
    logger.info('POST /events - Creating new event');
    const body = req.body as Record<string, unknown>;

    const errors: string[] = [];
    if (!body.type) errors.push('type is required');
    if (!body.date) errors.push('date is required');
    if (!body.user) errors.push('user is required');

    const hasEntityType = body.entityType !== undefined && body.entityType !== null;
    const hasEntityId = body.entityId !== undefined && body.entityId !== null;

    if (hasEntityType && !hasEntityId) {
      errors.push('entityId is required when entityType is provided');
    }
    if (hasEntityId && !hasEntityType) {
      errors.push('entityType is required when entityId is provided');
    }

    if (errors.length > 0) return ApiResponseBuilder.validationError(errors);

    const eventRequest: EventRequest = {
      entityType: body.entityType as EventRequest['entityType'],
      entityId: body.entityId as number | undefined,
      title: body.title as string,
      client: body.client as string,
      type: body.type as string,
      typeOtro: body.typeOtro as string,
      description: body.description as string,
      date: body.date as string,
      endDate: body.endDate as string,
      modalidad: body.modalidad as string,
      modalidadOtro: body.modalidadOtro as string,
      location: body.location as string,
      personaContacto: body.personaContacto as string,
      user: body.user as string,
      userOtro: body.userOtro as string,
      leadAuditor: body.leadAuditor as string,
      coAuditors: body.coAuditors as string,
      normas: body.normas as string,
      isVisible: body.isVisible as boolean,
    };

    const event = await eventService.createEvent(eventRequest);
    return { success: true, message: 'Event created successfully', data: event, timestamp: new Date().toISOString(), statusCode: 201 };
  }

  if (method === 'PATCH' && id) {
    logger.info(`PATCH /events/${id}`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid event ID');

    const body = req.body as Record<string, unknown>;

    const hasEntityType = body.entityType !== undefined && body.entityType !== null;
    const hasEntityId = body.entityId !== undefined && body.entityId !== null;

    if (hasEntityType && !hasEntityId) {
      return ApiResponseBuilder.validationError(['entityId is required when entityType is provided']);
    }
    if (hasEntityId && !hasEntityType) {
      return ApiResponseBuilder.validationError(['entityType is required when entityId is provided']);
    }

    const updateRequest: UpdateEventRequest = {
      entityType: body.entityType as UpdateEventRequest['entityType'],
      entityId: body.entityId as number | undefined,
      title: body.title as string,
      client: body.client as string,
      type: body.type as string,
      typeOtro: body.typeOtro as string,
      description: body.description as string,
      date: body.date as string,
      endDate: body.endDate as string,
      modalidad: body.modalidad as string,
      modalidadOtro: body.modalidadOtro as string,
      location: body.location as string,
      personaContacto: body.personaContacto as string,
      user: body.user as string,
      userOtro: body.userOtro as string,
      leadAuditor: body.leadAuditor as string,
      coAuditors: body.coAuditors as string,
      normas: body.normas as string,
      isVisible: body.isVisible as boolean,
    };

    const event = await eventService.updateEvent(id, updateRequest);
    return ApiResponseBuilder.success(event, 'Event updated successfully');
  }

  if (method === 'DELETE' && id) {
    logger.info(`DELETE /events/${id}`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid event ID');
    await eventService.deleteEvent(id);
    return ApiResponseBuilder.success({ id }, 'Event deleted successfully');
  }

  return ApiResponseBuilder.methodNotAllowed(`Method ${method} not allowed for this endpoint`);
};

export default withAuthenticatedApiHandler(funcEvents);

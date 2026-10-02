import { NotFoundError } from '../../shared/exceptions';
import { Logger } from '../../shared/Logger';
import { IEventDataSource } from '../../domain/interfaces/IEventDataSource';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { EventRequest, UpdateEventRequest, EventResponse } from '../../domain/entities/Event';
import { Event } from '@prisma/client';

const ENTITY_LABELS: Record<string, string> = {
  client: 'Client',
};

function toEventResponse(event: Event): EventResponse {
  return {
    id: event.id,
    entityType: event.entityType,
    entityId: event.entityId,
    title: event.title,
    client: event.client,
    type: event.type,
    typeOtro: event.typeOtro,
    description: event.description,
    date: event.date,
    endDate: event.endDate,
    modalidad: event.modalidad,
    modalidadOtro: event.modalidadOtro,
    location: event.location,
    personaContacto: event.personaContacto,
    user: event.user,
    userOtro: event.userOtro,
    leadAuditor: event.leadAuditor,
    coAuditors: event.coAuditors,
    normas: event.normas,
    isVisible: event.isVisible,
    createdAt: event.createdAt,
  };
}

export class EventService {
  private logger: Logger;
  private eventDataSource: IEventDataSource;
  private clientDataSource: IClientDataSource;

  constructor(
    logger: Logger,
    eventDataSource: IEventDataSource,
    clientDataSource: IClientDataSource
  ) {
    this.logger = logger;
    this.eventDataSource = eventDataSource;
    this.clientDataSource = clientDataSource;
  }

  private async validateEntityExists(entityType: string, entityId: number): Promise<void> {
    let exists = false;

    switch (entityType) {
      case 'client': {
        const entity = await this.clientDataSource.getById(entityId);
        exists = entity !== null;
        break;
      }
      default:
        throw new NotFoundError(`Invalid entity type: ${entityType}`);
    }

    if (!exists) {
      const label = ENTITY_LABELS[entityType] || entityType;
      throw new NotFoundError(`${label} with ID ${entityId} not found`);
    }
  }

  async getAllEvents(
    page?: number,
    limit?: number
  ): Promise<{ events: EventResponse[]; total: number }> {
    this.logger.info(`Fetching all events`);

    const result = await this.eventDataSource.getAll(page, limit);
    return {
      events: result.events.map(toEventResponse),
      total: result.total,
    };
  }

  async getEventsByEntity(entityType: string, entityId: number): Promise<EventResponse[]> {
    this.logger.info(`Fetching events for ${entityType}/${entityId}`);

    const events = await this.eventDataSource.getByEntity(entityType, entityId);
    return events.map(toEventResponse);
  }

  async createEvent(request: EventRequest): Promise<EventResponse> {
    this.logger.info(`Creating event for ${request.entityType || 'standalone'}/${request.entityId || 'n/a'}`);

    if (request.entityType && request.entityId) {
      await this.validateEntityExists(request.entityType, request.entityId);
    }

    const event = await this.eventDataSource.create({
      title: request.title,
      entityType: request.entityType,
      entityId: request.entityId,
      client: request.client,
      type: request.type,
      typeOtro: request.typeOtro,
      description: request.description,
      date: request.date,
      endDate: request.endDate,
      modalidad: request.modalidad,
      modalidadOtro: request.modalidadOtro,
      location: request.location,
      personaContacto: request.personaContacto,
      user: request.user,
      userOtro: request.userOtro,
      leadAuditor: request.leadAuditor,
      coAuditors: request.coAuditors,
      normas: request.normas,
      isVisible: request.isVisible,
    });

    this.logger.info(`Event created with ID: ${event.id}`);
    return toEventResponse(event);
  }

  async deleteEvent(id: number): Promise<void> {
    this.logger.info(`Deleting event ${id}`);

    await this.eventDataSource.delete(id);
    this.logger.info(`Event ${id} deleted successfully`);
  }

  async updateEvent(id: number, request: UpdateEventRequest): Promise<EventResponse> {
    this.logger.info(`Updating event ${id}`);

    const existingEvent = await this.eventDataSource.getById(id);
    if (!existingEvent) {
      throw new NotFoundError(`Event with ID ${id} not found`);
    }

    if (request.entityType && request.entityId) {
      await this.validateEntityExists(request.entityType, request.entityId);
    }

    const updatedEvent = await this.eventDataSource.update(id, {
      title: request.title,
      entityType: request.entityType,
      entityId: request.entityId,
      client: request.client,
      type: request.type,
      typeOtro: request.typeOtro,
      description: request.description,
      date: request.date,
      endDate: request.endDate,
      modalidad: request.modalidad,
      modalidadOtro: request.modalidadOtro,
      location: request.location,
      personaContacto: request.personaContacto,
      user: request.user,
      userOtro: request.userOtro,
      leadAuditor: request.leadAuditor,
      coAuditors: request.coAuditors,
      normas: request.normas,
      isVisible: request.isVisible,
    });

    this.logger.info(`Event ${id} updated successfully`);
    return toEventResponse(updatedEvent);
  }
}

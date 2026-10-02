import { Event } from '@prisma/client';

export interface IEventDataSource {
  getAll(page?: number, limit?: number): Promise<{ events: Event[]; total: number }>;
  getById(id: number): Promise<Event | null>;
  getByEntity(entityType: string, entityId: number): Promise<Event[]>;
  create(data: {
    title?: string;
    entityType?: string | null;
    entityId?: number | null;
    client?: string;
    type: string;
    typeOtro?: string;
    description?: string;
    date: string;
    endDate?: string;
    modalidad?: string;
    modalidadOtro?: string;
    location?: string;
    personaContacto?: string;
    user: string;
    userOtro?: string;
    leadAuditor?: string;
    coAuditors?: string;
    normas?: string;
    isVisible?: boolean;
  }): Promise<Event>;
  update(
    id: number,
    data: {
      title?: string;
      entityType?: string | null;
      entityId?: number | null;
      client?: string;
      type?: string;
      typeOtro?: string;
      description?: string;
      date?: string;
      endDate?: string;
      modalidad?: string;
      modalidadOtro?: string;
      location?: string;
      personaContacto?: string;
      user?: string;
      userOtro?: string;
      leadAuditor?: string;
      coAuditors?: string;
      normas?: string;
      isVisible?: boolean;
    }
  ): Promise<Event>;
  delete(id: number): Promise<void>;
}

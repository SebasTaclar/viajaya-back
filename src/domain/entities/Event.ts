export type EntityType = 'client';

export type EventRequest = {
  entityType?: EntityType;
  entityId?: number;
  title?: string;
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
};

export type UpdateEventRequest = {
  entityType?: EntityType | null;
  entityId?: number | null;
  title?: string;
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
};

export type EventResponse = {
  id: number;
  entityType: string | null;
  entityId: number | null;
  title?: string | null;
  client?: string | null;
  type: string;
  typeOtro?: string | null;
  description?: string | null;
  date: Date;
  endDate?: Date | null;
  modalidad?: string | null;
  modalidadOtro?: string | null;
  location?: string | null;
  personaContacto?: string | null;
  user: string;
  userOtro?: string | null;
  leadAuditor?: string | null;
  coAuditors?: string | null;
  normas?: string | null;
  isVisible: boolean;
  createdAt: Date;
};

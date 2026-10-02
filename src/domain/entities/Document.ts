import { EntityType } from './Event';

export type DocumentRequest = {
  entityType: EntityType;
  entityId: number;
  name: string;
  type: string;
  url: string;
  size?: number;
  user: string;
  isVisible?: boolean;
};

export type DocumentResponse = {
  id: number;
  entityType: string;
  entityId: number;
  name: string;
  type: string;
  url: string;
  size?: number | null;
  user: string;
  isVisible: boolean;
  createdAt: Date;
};

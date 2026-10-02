import { Document } from '@prisma/client';

export interface IDocumentDataSource {
  getAll(page?: number, limit?: number): Promise<{ documents: Document[]; total: number }>;
  getByEntity(entityType: string, entityId: number): Promise<Document[]>;
  getById(id: number): Promise<Document | null>;
  create(data: {
    entityType?: string;
    entityId?: number;
    name: string;
    type?: string;
    url: string;
    size?: number;
    user: string;
    isVisible?: boolean;
  }): Promise<Document>;
  update(id: number, data: {
    name?: string;
    type?: string;
    isVisible?: boolean;
  }): Promise<Document>;
  delete(id: number): Promise<void>;
}

import { Client } from '@prisma/client';

export interface IClientDataSource {
  getAll(page?: number, limit?: number): Promise<{ clients: Client[]; total: number }>;
  getById(id: number): Promise<Client | null>;
  getByUserId(userId: number): Promise<Client[]>;
  getByEmail(email: string): Promise<Client | null>;
  getByCedula(cedula: string): Promise<Client | null>;
  create(data: {
    name: string;
    cedula: string;
    ubicacion?: string;
    phone: string;
    email?: string;
    periodicidad: string;
    isActive?: boolean;
    userId?: number;
  }): Promise<Client>;
  update(
    id: number,
    data: {
      name?: string;
      cedula?: string;
      ubicacion?: string;
      phone?: string;
      email?: string;
      periodicidad?: string;
      isActive?: boolean;
      userId?: number | null;
    }
  ): Promise<Client>;
  delete(id: number): Promise<void>;
  search(query: string, page: number, limit: number): Promise<{ clients: Client[]; total: number }>;
}

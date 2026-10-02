import { Recaudo } from '@prisma/client';

export interface IRecaudoDataSource {
  getAll(page?: number, limit?: number, clientId?: number): Promise<{ recaudos: Recaudo[]; total: number }>;
  getById(id: number): Promise<Recaudo | null>;
  getByClientId(clientId: number, page?: number, limit?: number): Promise<{ recaudos: Recaudo[]; total: number }>;
  create(data: { clientId: number; fecha?: Date; valor: number }): Promise<Recaudo>;
  update(id: number, data: { fecha?: Date; valor?: number }): Promise<Recaudo>;
  delete(id: number): Promise<void>;
  countByClientId(clientId: number): Promise<number>;
  sumAll(): Promise<number>;
  sumByClientId(clientId: number): Promise<number>;
  sumGroupByClient(): Promise<{ clientId: number; total: number }[]>;
  getUltimoRecaudoPorCliente(): Promise<{ clientId: number; fecha: Date }[]>;
}

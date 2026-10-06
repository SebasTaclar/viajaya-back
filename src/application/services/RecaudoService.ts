import { NotFoundError, ValidationError } from '../../shared/exceptions';
import { Logger } from '../../shared/Logger';
import { IRecaudoDataSource } from '../../domain/interfaces/IRecaudoDataSource';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { Recaudo } from '@prisma/client';
import { AuditService } from './AuditService';
import {
  AUDIT_ACTIONS,
  AUDIT_STATUS,
  AUDIT_TABLES,
  AuditActor,
  auditSnapshot,
} from '../../domain/entities/AuditLog';

export interface RecaudoRequest {
  clientId: number;
  fecha?: string;
  valor: number;
}

export interface UpdateRecaudoRequest {
  fecha?: string;
  valor?: number;
}

export interface RecaudoResponse {
  id: number;
  clientId: number;
  fecha: Date;
  valor: number;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: number; name: string; cedula: string } | null;
}

function toRecaudoResponse(recaudo: Recaudo): RecaudoResponse {
  const withClient = recaudo as Recaudo & {
    client?: { id: number; name: string; cedula: string };
  };

  return {
    id: withClient.id,
    clientId: withClient.clientId,
    fecha: withClient.fecha,
    valor: Number(withClient.valor),
    createdAt: withClient.createdAt,
    updatedAt: withClient.updatedAt,
    client: withClient.client
      ? {
          id: withClient.client.id,
          name: withClient.client.name,
          cedula: withClient.client.cedula,
        }
      : null,
  };
}

export class RecaudoService {
  private logger: Logger;
  private recaudoDataSource: IRecaudoDataSource;
  private clientDataSource: IClientDataSource;
  private auditService: AuditService;

  constructor(
    logger: Logger,
    recaudoDataSource: IRecaudoDataSource,
    clientDataSource: IClientDataSource,
    auditService: AuditService
  ) {
    this.logger = logger;
    this.recaudoDataSource = recaudoDataSource;
    this.clientDataSource = clientDataSource;
    this.auditService = auditService;
  }

  private async recordRecaudoChange(
    action: typeof AUDIT_ACTIONS.CREATE | typeof AUDIT_ACTIONS.UPDATE | typeof AUDIT_ACTIONS.DELETE,
    entityId: number,
    actor: AuditActor | undefined,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.auditService.record({
      action,
      tableName: AUDIT_TABLES.RECAUDOS,
      entityId,
      actor,
      status: AUDIT_STATUS.SUCCESS,
      data,
    });
  }

  async getAllRecaudos(
    page?: number,
    limit?: number,
    clientId?: number
  ): Promise<{ recaudos: RecaudoResponse[]; total: number }> {
    this.logger.info(`Fetching recaudos - clientId: ${clientId || 'all'}`);

    const result = await this.recaudoDataSource.getAll(page, limit, clientId);
    return {
      recaudos: result.recaudos.map(toRecaudoResponse),
      total: result.total,
    };
  }

  async getRecaudosByClientId(
    clientId: number,
    page?: number,
    limit?: number
  ): Promise<{ recaudos: RecaudoResponse[]; total: number }> {
    this.logger.info(`Fetching recaudos for client ${clientId}`);

    const result = await this.recaudoDataSource.getByClientId(clientId, page, limit);
    return {
      recaudos: result.recaudos.map(toRecaudoResponse),
      total: result.total,
    };
  }

  async getOwnClientId(userId: number): Promise<number | null> {
    const clients = await this.clientDataSource.getByUserId(userId);
    return clients.length > 0 ? clients[0].id : null;
  }

  async getRecaudosByUserId(
    userId: number,
    page?: number,
    limit?: number
  ): Promise<{ recaudos: RecaudoResponse[]; total: number }> {
    const clientId = await this.getOwnClientId(userId);
    if (!clientId) {
      return { recaudos: [], total: 0 };
    }
    return this.getRecaudosByClientId(clientId, page, limit);
  }

  async getRecaudoById(id: number): Promise<RecaudoResponse> {
    this.logger.info(`Fetching recaudo by ID: ${id}`);

    const recaudo = await this.recaudoDataSource.getById(id);
    if (!recaudo) {
      throw new NotFoundError(`Recaudo with ID ${id} not found`);
    }

    return toRecaudoResponse(recaudo);
  }

  async createRecaudo(data: RecaudoRequest, actor?: AuditActor): Promise<RecaudoResponse> {
    this.logger.info(`Creating recaudo for client ${data.clientId}`);

    if (!data.clientId) throw new ValidationError('clientId is required');
    if (data.valor === undefined || data.valor === null) {
      throw new ValidationError('valor is required');
    }
    if (typeof data.valor !== 'number' || isNaN(data.valor) || data.valor <= 0) {
      throw new ValidationError('valor must be a number greater than 0');
    }

    const client = await this.clientDataSource.getById(data.clientId);
    if (!client) {
      throw new NotFoundError(`Client with ID ${data.clientId} not found`);
    }

    const recaudo = await this.recaudoDataSource.create({
      clientId: data.clientId,
      fecha: data.fecha ? new Date(data.fecha) : undefined,
      valor: data.valor,
    });

    this.logger.info(`Recaudo created with ID: ${recaudo.id}`);

    await this.recordRecaudoChange(AUDIT_ACTIONS.CREATE, recaudo.id, actor, {
      after: auditSnapshot(recaudo),
    });

    return toRecaudoResponse(recaudo);
  }

  async updateRecaudo(id: number, data: UpdateRecaudoRequest, actor?: AuditActor): Promise<RecaudoResponse> {
    this.logger.info(`Updating recaudo ${id}`);

    const existing = await this.recaudoDataSource.getById(id);
    if (!existing) {
      throw new NotFoundError(`Recaudo with ID ${id} not found`);
    }

    const beforeSnapshot = auditSnapshot(existing);

    if (data.valor !== undefined && (typeof data.valor !== 'number' || isNaN(data.valor) || data.valor <= 0)) {
      throw new ValidationError('valor must be a number greater than 0');
    }

    const recaudo = await this.recaudoDataSource.update(id, {
      fecha: data.fecha ? new Date(data.fecha) : undefined,
      valor: data.valor,
    });

    await this.recordRecaudoChange(AUDIT_ACTIONS.UPDATE, id, actor, {
      before: beforeSnapshot,
      after: auditSnapshot(recaudo),
    });

    return toRecaudoResponse(recaudo);
  }

  async deleteRecaudo(id: number, actor?: AuditActor): Promise<void> {
    this.logger.info(`Deleting recaudo ${id}`);

    const existing = await this.recaudoDataSource.getById(id);
    if (!existing) {
      throw new NotFoundError(`Recaudo with ID ${id} not found`);
    }

    await this.recaudoDataSource.delete(id);
    this.logger.info(`Recaudo ${id} deleted successfully`);

    await this.recordRecaudoChange(AUDIT_ACTIONS.DELETE, id, actor, {
      before: auditSnapshot(existing),
    });
  }
}

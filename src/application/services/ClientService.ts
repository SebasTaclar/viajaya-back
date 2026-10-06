import { NotFoundError, ConflictError, ValidationError } from '../../shared/exceptions';
import { Logger } from '../../shared/Logger';
import { PasswordUtils } from '../../shared/PasswordUtils';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { IUserDataSource } from '../../domain/interfaces/IUserDataSource';
import { IRecaudoDataSource } from '../../domain/interfaces/IRecaudoDataSource';
import { USER_ROLES } from '../../shared/UserRoles';
import { Client } from '@prisma/client';
import { AuditService } from './AuditService';
import {
  AUDIT_ACTIONS,
  AUDIT_STATUS,
  AUDIT_TABLES,
  AuditActor,
  auditSnapshot,
} from '../../domain/entities/AuditLog';

export const PERIODICIDADES = ['diario', 'semanal', 'quincenal', 'mensual'] as const;
export type Periodicidad = (typeof PERIODICIDADES)[number];

export interface ClientRequest {
  name: string;
  cedula: string;
  phone: string;
  periodicidad: string;
  ubicacion?: string;
  email?: string;
  password: string;
}

export interface UpdateClientRequest {
  name?: string;
  cedula?: string;
  phone?: string;
  periodicidad?: string;
  ubicacion?: string;
  email?: string;
  isActive?: boolean;
  password?: string;
}

export interface ClientResponse {
  id: number;
  name: string;
  cedula: string;
  ubicacion: string | null;
  phone: string;
  email: string | null;
  periodicidad: string;
  isActive: boolean;
  userId: number | null;
  saldo: number;
  createdAt: Date;
  updatedAt: Date;
}

function toClientResponse(client: Client, saldo: number = 0): ClientResponse {
  return {
    id: client.id,
    name: client.name,
    cedula: client.cedula,
    ubicacion: client.ubicacion,
    phone: client.phone,
    email: client.email,
    periodicidad: client.periodicidad,
    isActive: client.isActive,
    userId: client.userId,
    saldo,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

function validatePeriodicidad(periodicidad: string): void {
  if (!PERIODICIDADES.includes(periodicidad as Periodicidad)) {
    throw new ValidationError(
      `periodicidad must be one of: ${PERIODICIDADES.join(', ')}`
    );
  }
}

export class ClientService {
  private logger: Logger;
  private clientDataSource: IClientDataSource;
  private userDataSource: IUserDataSource;
  private recaudoDataSource: IRecaudoDataSource;
  private auditService: AuditService;

  constructor(
    logger: Logger,
    clientDataSource: IClientDataSource,
    userDataSource: IUserDataSource,
    recaudoDataSource: IRecaudoDataSource,
    auditService: AuditService
  ) {
    this.logger = logger;
    this.clientDataSource = clientDataSource;
    this.userDataSource = userDataSource;
    this.recaudoDataSource = recaudoDataSource;
    this.auditService = auditService;
  }

  private async recordClientChange(
    action: typeof AUDIT_ACTIONS.CREATE | typeof AUDIT_ACTIONS.UPDATE | typeof AUDIT_ACTIONS.DELETE,
    entityId: number,
    actor: AuditActor | undefined,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.auditService.record({
      action,
      tableName: AUDIT_TABLES.CLIENTS,
      entityId,
      actor,
      status: AUDIT_STATUS.SUCCESS,
      data,
    });
  }

  async createClient(data: ClientRequest, actor?: AuditActor): Promise<ClientResponse> {
    this.logger.info(`Creating client with cedula: ${data.cedula}`);

    const errors: string[] = [];
    if (!data.name) errors.push('name is required');
    if (!data.cedula) errors.push('cedula is required');
    if (!data.phone) errors.push('phone is required');
    if (!data.periodicidad) errors.push('periodicidad is required');
    if (!data.password) errors.push('password is required');
    if (errors.length > 0) throw new ValidationError(errors.join(', '));

    validatePeriodicidad(data.periodicidad);
    PasswordUtils.validatePassword(data.password);

    const existingCedula = await this.clientDataSource.getByCedula(data.cedula);
    if (existingCedula) {
      throw new ConflictError(`Client with cedula ${data.cedula} already exists`);
    }

    if (data.email) {
      const existingUser = await this.userDataSource.getByEmail(data.email);
      if (existingUser) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    const client = await this.clientDataSource.create({
      name: data.name,
      cedula: data.cedula,
      ubicacion: data.ubicacion,
      phone: data.phone,
      email: data.email,
      periodicidad: data.periodicidad,
    });

    try {
      const hashedPassword = await PasswordUtils.hashPassword(data.password);
      const user = await this.userDataSource.create({
        id: 0,
        email: data.email || null,
        password: hashedPassword,
        name: data.name,
        role: USER_ROLES.USER,
        membershipPaid: true,
      });

      const linked = await this.clientDataSource.update(client.id, { userId: user.id });
      this.logger.info(`Client ${client.id} created and linked to user ${user.id}`);

      await this.recordClientChange(AUDIT_ACTIONS.CREATE, client.id, actor, {
        after: auditSnapshot(linked),
      });

      return toClientResponse(linked, 0);
    } catch (error) {
      this.logger.logError(`Failed to create portal user for client ${client.id}`, error);
      try {
        await this.clientDataSource.delete(client.id);
      } catch {
        // cleanup best-effort
      }
      throw error;
    }
  }

  async getAllClients(
    page?: number,
    limit?: number
  ): Promise<{ clients: ClientResponse[]; total: number }> {
    this.logger.info(`Fetching all clients - Page: ${page || 'all'}, Limit: ${limit || 'all'}`);

    const result = await this.clientDataSource.getAll(page, limit);
    const saldos = await this.recaudoDataSource.sumGroupByClient();
    const saldoMap = new Map(saldos.map((s) => [s.clientId, s.total]));

    return {
      clients: result.clients.map((c) => toClientResponse(c, saldoMap.get(c.id) || 0)),
      total: result.total,
    };
  }

  async getClientById(id: number): Promise<ClientResponse> {
    this.logger.info(`Fetching client by ID: ${id}`);

    const client = await this.clientDataSource.getById(id);
    if (!client) {
      throw new NotFoundError(`Client with ID ${id} not found`);
    }

    const saldo = await this.recaudoDataSource.sumByClientId(id);
    return toClientResponse(client, saldo);
  }

  async getClientByEmail(email: string): Promise<ClientResponse | null> {
    this.logger.info(`Fetching client by email: ${email}`);

    const client = await this.clientDataSource.getByEmail(email);
    if (!client) return null;

    const saldo = await this.recaudoDataSource.sumByClientId(client.id);
    return toClientResponse(client, saldo);
  }

  async getClientsByUserId(userId: number): Promise<ClientResponse[]> {
    this.logger.info(`Fetching clients for user ID: ${userId}`);

    const clients = await this.clientDataSource.getByUserId(userId);
    const saldos = await this.recaudoDataSource.sumGroupByClient();
    const saldoMap = new Map(saldos.map((s) => [s.clientId, s.total]));

    return clients.map((c) => toClientResponse(c, saldoMap.get(c.id) || 0));
  }

  async updateClient(id: number, data: UpdateClientRequest, actor?: AuditActor): Promise<ClientResponse> {
    this.logger.info(`Updating client with ID: ${id}`);

    const existingClient = await this.clientDataSource.getById(id);
    if (!existingClient) {
      throw new NotFoundError(`Client with ID ${id} not found`);
    }

    const beforeSnapshot = auditSnapshot(existingClient);

    if (data.periodicidad) validatePeriodicidad(data.periodicidad);
    if (data.password) PasswordUtils.validatePassword(data.password);

    if (data.cedula && data.cedula !== existingClient.cedula) {
      const cedulaExists = await this.clientDataSource.getByCedula(data.cedula);
      if (cedulaExists) {
        throw new ConflictError(`Cedula ${data.cedula} is already in use`);
      }
    }

    if (data.email && data.email !== existingClient.email) {
      const existingUser = await this.userDataSource.getByEmail(data.email);
      if (existingUser) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    const client = await this.clientDataSource.update(id, {
      name: data.name,
      cedula: data.cedula,
      ubicacion: data.ubicacion,
      phone: data.phone,
      email: data.email,
      periodicidad: data.periodicidad,
      isActive: data.isActive,
    });

    // Keep portal user in sync / create it if missing (legacy clients)
    if (data.password || data.email) {
      if (client.userId) {
        const updateData: { password?: string; email?: string; name?: string } = {};
        if (data.password) updateData.password = await PasswordUtils.hashPassword(data.password);
        if (data.email) updateData.email = data.email;
        if (data.name) updateData.name = data.name;
        await this.userDataSource.update(client.userId.toString(), updateData);
      } else if (data.password) {
        const hashedPassword = await PasswordUtils.hashPassword(data.password);
        const user = await this.userDataSource.create({
          id: 0,
          email: data.email || client.email || null,
          password: hashedPassword,
          name: client.name,
          role: USER_ROLES.USER,
          membershipPaid: true,
        });
        await this.clientDataSource.update(id, { userId: user.id });
        this.logger.info(`Portal user ${user.id} created for legacy client ${id}`);
      }
    }

    const updatedClient = (await this.clientDataSource.getById(id)) ?? client;
    const saldo = await this.recaudoDataSource.sumByClientId(id);

    await this.recordClientChange(AUDIT_ACTIONS.UPDATE, id, actor, {
      before: beforeSnapshot,
      after: auditSnapshot(updatedClient),
    });

    this.logger.info(`Client ${id} updated successfully`);
    return toClientResponse(updatedClient, saldo);
  }

  async deleteClient(id: number, actor?: AuditActor): Promise<void> {
    this.logger.info(`Deleting client with ID: ${id}`);

    const existingClient = await this.clientDataSource.getById(id);
    if (!existingClient) {
      throw new NotFoundError(`Client with ID ${id} not found`);
    }

    const recaudoCount = await this.recaudoDataSource.countByClientId(id);
    if (recaudoCount > 0) {
      throw new ConflictError(
        'Client has recaudos and cannot be deleted. Delete its recaudos first'
      );
    }

    if (existingClient.userId) {
      await this.userDataSource.delete(existingClient.userId.toString());
      this.logger.info(`Portal user ${existingClient.userId} deleted with client ${id}`);
    }

    await this.clientDataSource.delete(id);
    this.logger.info(`Client ${id} deleted successfully`);

    await this.recordClientChange(AUDIT_ACTIONS.DELETE, id, actor, {
      before: auditSnapshot(existingClient),
    });
  }

  async searchClients(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ clients: ClientResponse[]; total: number }> {
    this.logger.info(`Searching clients with query: ${query}`);

    const result = await this.clientDataSource.search(query, page, limit);
    const saldos = await this.recaudoDataSource.sumGroupByClient();
    const saldoMap = new Map(saldos.map((s) => [s.clientId, s.total]));

    return {
      clients: result.clients.map((c) => toClientResponse(c, saldoMap.get(c.id) || 0)),
      total: result.total,
    };
  }
}

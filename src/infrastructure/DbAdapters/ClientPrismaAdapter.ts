import { getPrismaClient } from '../../config/PrismaClient';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { Client } from '@prisma/client';

export class ClientPrismaAdapter implements IClientDataSource {
  private prisma = getPrismaClient();

  async getAll(
    page?: number,
    limit?: number
  ): Promise<{ clients: Client[]; total: number }> {
    const shouldPaginate = page !== undefined && limit !== undefined;
    const skip = shouldPaginate ? (page! - 1) * limit! : undefined;
    const take = shouldPaginate ? limit : undefined;

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count(),
    ]);

    return { clients, total };
  }

  async getById(id: number): Promise<Client | null> {
    return await this.prisma.client.findUnique({
      where: { id },
    });
  }

  async getByEmail(email: string): Promise<Client | null> {
    return await this.prisma.client.findFirst({
      where: { email },
    });
  }

  async getByUserId(userId: number): Promise<Client[]> {
    return await this.prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByCedula(cedula: string): Promise<Client | null> {
    return await this.prisma.client.findFirst({
      where: { cedula },
    });
  }

  async create(data: {
    name: string;
    cedula: string;
    ubicacion?: string;
    phone: string;
    email?: string;
    periodicidad: string;
    isActive?: boolean;
    userId?: number;
  }): Promise<Client> {
    return await this.prisma.client.create({
      data: {
        name: data.name,
        cedula: data.cedula,
        ubicacion: data.ubicacion || null,
        phone: data.phone,
        email: data.email || null,
        periodicidad: data.periodicidad,
        isActive: data.isActive ?? true,
        userId: data.userId || null,
      },
    });
  }

  async update(
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
  ): Promise<Client> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.cedula !== undefined) updateData.cedula = data.cedula;
    if (data.ubicacion !== undefined) updateData.ubicacion = data.ubicacion;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.periodicidad !== undefined) updateData.periodicidad = data.periodicidad;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.userId !== undefined) updateData.userId = data.userId;

    return await this.prisma.client.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.client.delete({
      where: { id },
    });
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ clients: Client[]; total: number }> {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
        { cedula: { contains: query, mode: 'insensitive' as const } },
        { ubicacion: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { clients, total };
  }
}

import { getPrismaClient } from '../../config/PrismaClient';
import { IRecaudoDataSource } from '../../domain/interfaces/IRecaudoDataSource';
import { Recaudo } from '@prisma/client';

export class RecaudoPrismaAdapter implements IRecaudoDataSource {
  private prisma = getPrismaClient();

  async getAll(
    page?: number,
    limit?: number,
    clientId?: number
  ): Promise<{ recaudos: Recaudo[]; total: number }> {
    const shouldPaginate = page !== undefined && limit !== undefined;
    const where = clientId !== undefined ? { clientId } : {};

    const [recaudos, total] = await Promise.all([
      this.prisma.recaudo.findMany({
        where,
        skip: shouldPaginate ? (page! - 1) * limit! : undefined,
        take: shouldPaginate ? limit : undefined,
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.recaudo.count({ where }),
    ]);

    return { recaudos, total };
  }

  async getById(id: number): Promise<Recaudo | null> {
    return await this.prisma.recaudo.findUnique({ where: { id } });
  }

  async getByClientId(
    clientId: number,
    page?: number,
    limit?: number
  ): Promise<{ recaudos: Recaudo[]; total: number }> {
    return this.getAll(page, limit, clientId);
  }

  async create(data: { clientId: number; fecha?: Date; valor: number }): Promise<Recaudo> {
    return await this.prisma.recaudo.create({
      data: {
        clientId: data.clientId,
        fecha: data.fecha || new Date(),
        valor: data.valor,
      },
    });
  }

  async update(id: number, data: { fecha?: Date; valor?: number }): Promise<Recaudo> {
    const updateData: { fecha?: Date; valor?: number } = {};
    if (data.fecha !== undefined) updateData.fecha = data.fecha;
    if (data.valor !== undefined) updateData.valor = data.valor;

    return await this.prisma.recaudo.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.recaudo.delete({ where: { id } });
  }

  async countByClientId(clientId: number): Promise<number> {
    return await this.prisma.recaudo.count({ where: { clientId } });
  }

  async sumAll(): Promise<number> {
    const result = await this.prisma.recaudo.aggregate({ _sum: { valor: true } });
    return Number(result._sum.valor || 0);
  }

  async sumByClientId(clientId: number): Promise<number> {
    const result = await this.prisma.recaudo.aggregate({
      where: { clientId },
      _sum: { valor: true },
    });
    return Number(result._sum.valor || 0);
  }

  async sumGroupByClient(): Promise<{ clientId: number; total: number }[]> {
    const grouped = await this.prisma.recaudo.groupBy({
      by: ['clientId'],
      _sum: { valor: true },
    });
    return grouped.map((g) => ({ clientId: g.clientId, total: Number(g._sum.valor || 0) }));
  }

  async getUltimoRecaudoPorCliente(): Promise<{ clientId: number; fecha: Date }[]> {
    const grouped = await this.prisma.recaudo.groupBy({
      by: ['clientId'],
      _max: { fecha: true },
    });
    return grouped
      .filter((g) => g._max.fecha !== null)
      .map((g) => ({ clientId: g.clientId, fecha: g._max.fecha as Date }));
  }
}

import { getPrismaClient } from '../../config/PrismaClient';
import { IDocumentDataSource } from '../../domain/interfaces/IDocumentDataSource';
import { Document } from '@prisma/client';

export class DocumentPrismaAdapter implements IDocumentDataSource {
  private prisma = getPrismaClient();

  async getAll(
    page?: number,
    limit?: number
  ): Promise<{ documents: Document[]; total: number }> {
    const shouldPaginate = page !== undefined && limit !== undefined;
    const skip = shouldPaginate ? (page! - 1) * limit! : undefined;
    const take = shouldPaginate ? limit : undefined;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count(),
    ]);

    return { documents, total };
  }

  async getByEntity(entityType: string, entityId: number): Promise<Document[]> {
    return await this.prisma.document.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: number): Promise<Document | null> {
    return await this.prisma.document.findUnique({
      where: { id },
    });
  }

  async create(data: {
    entityType?: string;
    entityId?: number;
    name: string;
    type?: string;
    url: string;
    size?: number;
    user: string;
    isVisible?: boolean;
  }): Promise<Document> {
    return await this.prisma.document.create({
      data: {
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        name: data.name,
        type: data.type ?? null,
        url: data.url,
        size: data.size || null,
        user: data.user,
        isVisible: data.isVisible ?? false,
      },
    });
  }

  async update(id: number, data: {
    name?: string;
    type?: string;
    isVisible?: boolean;
  }): Promise<Document> {
    return await this.prisma.document.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.document.delete({
      where: { id },
    });
  }
}

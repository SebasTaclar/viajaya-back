import { getPrismaClient } from '../../config/PrismaClient';
import { IEventDataSource } from '../../domain/interfaces/IEventDataSource';
import { Event } from '@prisma/client';

export class EventPrismaAdapter implements IEventDataSource {
  private prisma = getPrismaClient();

  async getAll(
    page?: number,
    limit?: number
  ): Promise<{ events: Event[]; total: number }> {
    const shouldPaginate = page !== undefined && limit !== undefined;
    const skip = shouldPaginate ? (page! - 1) * limit! : undefined;
    const take = shouldPaginate ? limit : undefined;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.event.count(),
    ]);

    return { events, total };
  }

  async getByEntity(entityType: string, entityId: number): Promise<Event[]> {
    return await this.prisma.event.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getById(id: number): Promise<Event | null> {
    return await this.prisma.event.findUnique({
      where: { id },
    });
  }

  async update(
    id: number,
    data: {
      title?: string;
      entityType?: string | null;
      entityId?: number | null;
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
    }
  ): Promise<Event> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.entityType !== undefined) updateData.entityType = data.entityType;
    if (data.entityId !== undefined) updateData.entityId = data.entityId;
    if (data.client !== undefined) updateData.client = data.client;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.typeOtro !== undefined) updateData.typeOtro = data.typeOtro;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.modalidad !== undefined) updateData.modalidad = data.modalidad;
    if (data.modalidadOtro !== undefined) updateData.modalidadOtro = data.modalidadOtro;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.personaContacto !== undefined) updateData.personaContacto = data.personaContacto;
    if (data.user !== undefined) updateData.user = data.user;
    if (data.userOtro !== undefined) updateData.userOtro = data.userOtro;
    if (data.leadAuditor !== undefined) updateData.leadAuditor = data.leadAuditor;
    if (data.coAuditors !== undefined) updateData.coAuditors = data.coAuditors;
    if (data.normas !== undefined) updateData.normas = data.normas;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;

    return await this.prisma.event.update({
      where: { id },
      data: updateData,
    });
  }

  async create(data: {
    title?: string;
    entityType?: string | null;
    entityId?: number | null;
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
  }): Promise<Event> {
    return await this.prisma.event.create({
      data: {
        title: data.title,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        client: data.client,
        type: data.type,
        typeOtro: data.typeOtro,
        description: data.description,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        modalidad: data.modalidad,
        modalidadOtro: data.modalidadOtro,
        location: data.location,
        personaContacto: data.personaContacto,
        user: data.user,
        userOtro: data.userOtro,
        leadAuditor: data.leadAuditor,
        coAuditors: data.coAuditors,
        normas: data.normas,
        isVisible: data.isVisible ?? false,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.event.delete({
      where: { id },
    });
  }
}

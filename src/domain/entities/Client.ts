export type Client = {
  id: number;
  name: string;
  cedula: string;
  ubicacion?: string | null;
  phone: string;
  email?: string | null;
  periodicidad: string;
  isActive: boolean;
  userId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
};

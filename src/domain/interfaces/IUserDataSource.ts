import { User } from '../entities/User';

export interface UserClient {
  id: number;
  name: string;
  cedula: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface UserWithClients extends Omit<User, 'password'> {
  client: UserClient | null;
}

export interface IUserDataSource {
  getAll(query?: unknown): Promise<User[]>;
  getAllWithClients(): Promise<UserWithClients[]>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

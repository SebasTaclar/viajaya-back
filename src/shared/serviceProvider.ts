import { Logger } from './Logger';
import { AuthService } from '../application/services/AuthService';
import { CategoryService } from '../application/services/CategoryService';
import { ProductService } from '../application/services/ProductService';
import { HealthService } from '../application/services/HealthService';
import { PurchaseService } from '../application/services/PurchaseService';
import { CleanupService } from '../application/services/CleanupService';
import { ClientService } from '../application/services/ClientService';
import { RecaudoService } from '../application/services/RecaudoService';
import { DashboardService } from '../application/services/DashboardService';
import { EventService } from '../application/services/EventService';
import { DocumentService } from '../application/services/DocumentService';
import { PendingBalanceReminderService } from '../application/services/PendingBalanceReminderService';
import { MercadoPagoService } from '../infrastructure/services/MercadoPagoService';
import { EmailService } from '../infrastructure/services/EmailService';
import { CloudflareR2Service } from '../infrastructure/services/CloudflareR2Service';
import { FileStorageService } from '../infrastructure/services/FileStorageService';
import { TextBeeService } from '../infrastructure/services/TextBeeService';
import { UserPrismaAdapter } from '../infrastructure/DbAdapters/UserPrismaAdapter';
import { CategoryPrismaAdapter } from '../infrastructure/DbAdapters/CategoryPrismaAdapter';
import { ProductPrismaAdapter } from '../infrastructure/DbAdapters/ProductPrismaAdapter';
import { OrderDetailPrismaAdapter } from '../infrastructure/DbAdapters/OrderDetailPrismaAdapter';
import { ClientPrismaAdapter } from '../infrastructure/DbAdapters/ClientPrismaAdapter';
import { RecaudoPrismaAdapter } from '../infrastructure/DbAdapters/RecaudoPrismaAdapter';
import { EventPrismaAdapter } from '../infrastructure/DbAdapters/EventPrismaAdapter';
import { DocumentPrismaAdapter } from '../infrastructure/DbAdapters/DocumentPrismaAdapter';
import { IUserDataSource } from '../domain/interfaces/IUserDataSource';
import { ICategoryDataSource } from '../domain/interfaces/ICategoryDataSource';
import { IProductDataSource } from '../domain/interfaces/IProductDataSource';
import { IOrderDetailDataSource } from '../domain/interfaces/IOrderDetailDataSource';
import { IClientDataSource } from '../domain/interfaces/IClientDataSource';
import { IRecaudoDataSource } from '../domain/interfaces/IRecaudoDataSource';
import { IEventDataSource } from '../domain/interfaces/IEventDataSource';
import { IDocumentDataSource } from '../domain/interfaces/IDocumentDataSource';
import { getPrismaClient } from '../config/PrismaClient';

export class ServiceProvider {
  private static prismaClient = getPrismaClient();

  static getUserDataSource(): IUserDataSource {
    return new UserPrismaAdapter();
  }

  static getCategoryDataSource(): ICategoryDataSource {
    return new CategoryPrismaAdapter();
  }

  static getProductDataSource(): IProductDataSource {
    return new ProductPrismaAdapter();
  }

  static getOrderDetailDataSource(): IOrderDetailDataSource {
    return new OrderDetailPrismaAdapter();
  }

  static getClientDataSource(): IClientDataSource {
    return new ClientPrismaAdapter();
  }

  static getRecaudoDataSource(): IRecaudoDataSource {
    return new RecaudoPrismaAdapter();
  }

  static getEventDataSource(): IEventDataSource {
    return new EventPrismaAdapter();
  }

  static getDocumentDataSource(): IDocumentDataSource {
    return new DocumentPrismaAdapter();
  }

  static getAuthService(logger: Logger): AuthService {
    const userDataSource = this.getUserDataSource();
    const clientDataSource = this.getClientDataSource();
    return new AuthService(logger, userDataSource, clientDataSource);
  }

  static getCategoryService(logger: Logger): CategoryService {
    const categoryDataSource = this.getCategoryDataSource();
    return new CategoryService(logger, categoryDataSource);
  }

  static getProductService(logger: Logger): ProductService {
    const productDataSource = this.getProductDataSource();
    const categoryDataSource = this.getCategoryDataSource();
    return new ProductService(logger, productDataSource, categoryDataSource);
  }

  static getHealthService(logger: Logger): HealthService {
    return new HealthService(logger);
  }

  static getPurchaseService(): PurchaseService {
    const orderDetailDataSource = this.getOrderDetailDataSource();
    const productDataSource = this.getProductDataSource();
    return new PurchaseService(this.prismaClient, orderDetailDataSource, productDataSource);
  }

  static getCleanupService(logger: Logger): CleanupService {
    const mercadoPagoService = this.getMercadoPagoService();
    return new CleanupService(this.prismaClient, mercadoPagoService, logger);
  }

  static getClientService(logger: Logger): ClientService {
    const clientDataSource = this.getClientDataSource();
    const userDataSource = this.getUserDataSource();
    const recaudoDataSource = this.getRecaudoDataSource();
    return new ClientService(logger, clientDataSource, userDataSource, recaudoDataSource);
  }

  static getRecaudoService(logger: Logger): RecaudoService {
    const recaudoDataSource = this.getRecaudoDataSource();
    const clientDataSource = this.getClientDataSource();
    return new RecaudoService(logger, recaudoDataSource, clientDataSource);
  }

  static getDashboardService(logger: Logger): DashboardService {
    const clientDataSource = this.getClientDataSource();
    const recaudoDataSource = this.getRecaudoDataSource();
    return new DashboardService(logger, clientDataSource, recaudoDataSource);
  }

  static getEventService(logger: Logger): EventService {
    const eventDataSource = this.getEventDataSource();
    const clientDataSource = this.getClientDataSource();
    return new EventService(logger, eventDataSource, clientDataSource);
  }

  static getDocumentService(logger: Logger): DocumentService {
    const documentDataSource = this.getDocumentDataSource();
    const fileStorageService = this.getFileStorageService(logger);
    const clientDataSource = this.getClientDataSource();
    return new DocumentService(logger, documentDataSource, fileStorageService, clientDataSource);
  }

  static getEmailService(logger: Logger): EmailService {
    return new EmailService(logger);
  }

  static getPendingBalanceReminderService(logger: Logger): PendingBalanceReminderService {
    return new PendingBalanceReminderService(this.prismaClient, logger);
  }

  static getMercadoPagoService(): MercadoPagoService {
    return new MercadoPagoService();
  }

  static getR2Service(logger: Logger): CloudflareR2Service {
    return new CloudflareR2Service(logger);
  }

  static getFileStorageService(logger: Logger): FileStorageService {
    const r2Service = this.getR2Service(logger);
    return new FileStorageService(logger, r2Service);
  }

  static getTextBeeService(logger: Logger): TextBeeService {
    return new TextBeeService(logger);
  }
}

export const getAuthService = (logger: Logger): AuthService => {
  return ServiceProvider.getAuthService(logger);
};

export const getCategoryService = (logger: Logger): CategoryService => {
  return ServiceProvider.getCategoryService(logger);
};

export const getProductService = (logger: Logger): ProductService => {
  return ServiceProvider.getProductService(logger);
};

export const getHealthService = (logger: Logger): HealthService => {
  return ServiceProvider.getHealthService(logger);
};

export const getPurchaseService = (): PurchaseService => {
  return ServiceProvider.getPurchaseService();
};

export const getCleanupService = (logger: Logger): CleanupService => {
  return ServiceProvider.getCleanupService(logger);
};

export const getEmailService = (logger: Logger): EmailService => {
  return ServiceProvider.getEmailService(logger);
};

export const getPendingBalanceReminderService = (logger: Logger): PendingBalanceReminderService => {
  return ServiceProvider.getPendingBalanceReminderService(logger);
};

export const getMercadoPagoService = (): MercadoPagoService => {
  return ServiceProvider.getMercadoPagoService();
};

export const getR2Service = (logger: Logger): CloudflareR2Service => {
  return ServiceProvider.getR2Service(logger);
};

export const getFileStorageService = (logger: Logger): FileStorageService => {
  return ServiceProvider.getFileStorageService(logger);
};

export const getClientService = (logger: Logger): ClientService => {
  return ServiceProvider.getClientService(logger);
};

export const getRecaudoService = (logger: Logger): RecaudoService => {
  return ServiceProvider.getRecaudoService(logger);
};

export const getDashboardService = (logger: Logger): DashboardService => {
  return ServiceProvider.getDashboardService(logger);
};

export const getEventService = (logger: Logger): EventService => {
  return ServiceProvider.getEventService(logger);
};

export const getDocumentService = (logger: Logger): DocumentService => {
  return ServiceProvider.getDocumentService(logger);
};

export const getTextBeeService = (logger: Logger): TextBeeService => {
  return ServiceProvider.getTextBeeService(logger);
};

export const getUserDataSource = (): IUserDataSource => {
  return ServiceProvider.getUserDataSource();
};

export const getCategoryDataSource = (): ICategoryDataSource => {
  return ServiceProvider.getCategoryDataSource();
};

export const getProductDataSource = (): IProductDataSource => {
  return ServiceProvider.getProductDataSource();
};

export const getOrderDetailDataSource = (): IOrderDetailDataSource => {
  return ServiceProvider.getOrderDetailDataSource();
};

export const getClientDataSource = (): IClientDataSource => {
  return ServiceProvider.getClientDataSource();
};

export const getRecaudoDataSource = (): IRecaudoDataSource => {
  return ServiceProvider.getRecaudoDataSource();
};

export const getEventDataSource = (): IEventDataSource => {
  return ServiceProvider.getEventDataSource();
};

export const getDocumentDataSource = (): IDocumentDataSource => {
  return ServiceProvider.getDocumentDataSource();
};

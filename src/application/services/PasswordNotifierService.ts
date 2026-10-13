import { Logger } from '../../shared/Logger';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { TextBeeService } from '../../infrastructure/services/TextBeeService';
import { createPasswordSmsMessage } from '../../infrastructure/services/smsTemplates';

/**
 * Servicio utilitario para notificar claves nuevas a clientes por SMS.
 * La clave en texto plano solo existe en memoria durante el envío:
 * nunca se registra en logs ni se incluye en respuestas.
 */
export class PasswordNotifierService {
  private logger: Logger;
  private textBeeService: TextBeeService;
  private clientDataSource: IClientDataSource;

  constructor(
    logger: Logger,
    textBeeService: TextBeeService,
    clientDataSource: IClientDataSource
  ) {
    this.logger = logger;
    this.textBeeService = textBeeService;
    this.clientDataSource = clientDataSource;
  }

  /**
   * Construye el mensaje SMS con la clave nueva
   */
  buildMessage(name: string, password: string): string {
    return createPasswordSmsMessage({ name, password });
  }

  /**
   * Envía la clave por SMS al celular indicado. Lanza error si el envío falla.
   */
  async send(phone: string, name: string, password: string): Promise<void> {
    await this.textBeeService.sendSms([phone], this.buildMessage(name, password));
    this.logger.logInfo(`Password SMS notification sent to ${phone}`);
  }

  /**
   * Notifica la clave por SMS solo si el usuario tiene un client vinculado con celular.
   * Best-effort: si no tiene celular o el SMS falla, solo se registra un warning
   * y la operación original no falla.
   */
  async notifyIfClient(userId: string | number, password: string): Promise<void> {
    try {
      const clients = await this.clientDataSource.getByUserId(Number(userId));
      const client = clients[0];

      if (!client || !client.phone) {
        this.logger.logWarning(
          `Password notification skipped: user ${userId} has no linked client with phone`
        );
        return;
      }

      const name = client.name || 'cliente';
      await this.send(client.phone, name, password);
    } catch (error) {
      this.logger.logWarning(
        `Password notification failed for user ${userId} (password change already applied)`,
        error
      );
    }
  }
}

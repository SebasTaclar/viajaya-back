import { Logger } from '../../shared/Logger';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { IRecaudoDataSource } from '../../domain/interfaces/IRecaudoDataSource';

export const LIMITES_INACTIVIDAD: Record<string, number> = {
  diario: 7,
  semanal: 15,
  quincenal: 30,
  mensual: 30,
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface AlertaInactividad {
  clientId: number;
  name: string;
  cedula: string;
  periodicidad: string;
  ultimoRecaudo: Date | null;
  diasInactivo: number;
  limiteDias: number;
}

export interface DashboardResponse {
  dineroFondoViajero: number;
  usuariosRegistrados: number;
  alertasInactividad: AlertaInactividad[];
}

export class DashboardService {
  private logger: Logger;
  private clientDataSource: IClientDataSource;
  private recaudoDataSource: IRecaudoDataSource;

  constructor(
    logger: Logger,
    clientDataSource: IClientDataSource,
    recaudoDataSource: IRecaudoDataSource
  ) {
    this.logger = logger;
    this.clientDataSource = clientDataSource;
    this.recaudoDataSource = recaudoDataSource;
  }

  async getDashboard(): Promise<DashboardResponse> {
    this.logger.info('Building dashboard KPIs');

    const [clientsResult, dineroFondoViajero, ultimosRecaudos] = await Promise.all([
      this.clientDataSource.getAll(),
      this.recaudoDataSource.sumAll(),
      this.recaudoDataSource.getUltimoRecaudoPorCliente(),
    ]);

    const ultimoMap = new Map(ultimosRecaudos.map((r) => [r.clientId, r.fecha]));
    const now = Date.now();

    const alertasInactividad: AlertaInactividad[] = [];

    for (const client of clientsResult.clients) {
      if (!client.isActive) continue;

      const limiteDias = LIMITES_INACTIVIDAD[client.periodicidad] ?? 30;
      const ultimoRecaudo = ultimoMap.get(client.id) || null;
      const fechaReferencia = ultimoRecaudo || client.createdAt;
      const diasInactivo = Math.floor((now - fechaReferencia.getTime()) / MS_POR_DIA);

      if (diasInactivo > limiteDias) {
        alertasInactividad.push({
          clientId: client.id,
          name: client.name,
          cedula: client.cedula,
          periodicidad: client.periodicidad,
          ultimoRecaudo,
          diasInactivo,
          limiteDias,
        });
      }
    }

    alertasInactividad.sort((a, b) => b.diasInactivo - a.diasInactivo);

    this.logger.info(
      `Dashboard: ${dineroFondoViajero} en fondo, ${clientsResult.total} usuarios, ${alertasInactividad.length} alertas`
    );

    return {
      dineroFondoViajero,
      usuariosRegistrados: clientsResult.total,
      alertasInactividad,
    };
  }
}

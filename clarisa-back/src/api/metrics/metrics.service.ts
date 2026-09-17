import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';

import { MetricsDto } from './dto/metrics.dto';
import { Institution } from '../institution/entities/institution.entity';
import { Project } from '../project/entity/project.entity';
import { Workpackage } from '../workpackage/entities/workpackage.entity';
import { Country } from '../country/entities/country.entity';
import { Initiative } from '../initiative/entities/initiative.entity';
import { HomepageClarisaEndpoint } from '../homepage-clarisa-endpoint/entities/homepage-clarisa-endpoint.entity';

/**
 * El tamaño del catálogo, contado contra la base de datos.
 *
 * Existe porque la home publicaba seis cifras ESCRITAS A MANO, y envejecieron:
 * decía 32 iniciativas cuando hay 43, y 7.060 instituciones cuando hay 10.630.
 * Un producto cuya razón de ser es un API no puede presentarse con números
 * pegados: si el dato cambia en la base, tiene que cambiar en la página sola.
 *
 * 🛑 Y NO se cuenta llamando a los endpoints públicos. `GET api/institutions`
 * pesa ~4,7 MB: contar por ahí sería bajarse el catálogo entero para quedarse
 * con un número. Aquí se hace lo único sensato, un `COUNT(*)` por tabla.
 */
@Injectable()
export class MetricsService {
  private readonly _logger: Logger = new Logger(MetricsService.name);

  /** Una hora. Son cifras de portada: nadie nota que lleguen con ese retraso. */
  private static readonly TTL_MS = 60 * 60 * 1000;

  private static readonly CACHE_KEY = 'clarisa:metrics';

  constructor(
    private readonly _dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly _cache: Cache,
  ) {}

  async find(): Promise<MetricsDto> {
    const cached = await this._cache.get<MetricsDto>(MetricsService.CACHE_KEY);
    if (cached) return cached;

    let metrics: MetricsDto;
    try {
      metrics = await this.count();
    } catch (error) {
      // 🛑 Aquí NO se devuelven ceros. Un cero inventado en la portada se lee
      // como un catálogo vacío, y quien lo vea no tiene forma de distinguirlo
      // de un catálogo de verdad vacío. Se propaga el fallo y que el que
      // llama decida: el front ya sabe quedarse sin cifras sin romperse.
      this._logger.error(`No se pudieron contar las métricas: ${error}`);
      throw error;
    }

    await this._cache.set(
      MetricsService.CACHE_KEY,
      metrics,
      MetricsService.TTL_MS,
    );

    return metrics;
  }

  /**
   * Los seis conteos, en paralelo.
   *
   * Todos filtran por `is_active`: el catálogo que se enseña es el vigente, que
   * es además lo que devuelven por defecto los endpoints públicos. Si aquí se
   * contara todo y allá solo lo activo, la portada diría un número que ningún
   * endpoint puede reproducir.
   */
  private async count(): Promise<MetricsDto> {
    const active = { auditableFields: { is_active: true } };

    const [
      institutions,
      projects,
      workPackages,
      countries,
      initiatives,
      controlLists,
    ] = await Promise.all([
      this._dataSource.getRepository(Institution).count({ where: active }),
      this._dataSource.getRepository(Project).count({ where: active }),
      this._dataSource.getRepository(Workpackage).count({ where: active }),
      this._dataSource.getRepository(Country).count({ where: active }),
      this._dataSource.getRepository(Initiative).count({ where: active }),
      this._dataSource
        .getRepository(HomepageClarisaEndpoint)
        .count({ where: active }),
    ]);

    return {
      institutions,
      projects,
      workPackages,
      countries,
      initiatives,
      controlLists,
      generatedAt: new Date().toISOString(),
    };
  }
}

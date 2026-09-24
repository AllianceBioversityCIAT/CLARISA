import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * 🛑 Módulo ADITIVO. No toca ni reemplaza a ninguno de los que ya existían:
 * añade la ruta `api/metrics` y nada más. Ningún endpoint anterior cambia de
 * forma, de nombre ni de contenido por su culpa — que es la única manera de
 * tocar CLARISA, porque PRMS, MEL, MARLO, E-Contracts, Foresight y ToC leen
 * este API sin avisar.
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}

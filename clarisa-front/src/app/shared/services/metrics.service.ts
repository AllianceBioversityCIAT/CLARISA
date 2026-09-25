import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

/**
 * El tamaño del catálogo, tal y como lo publica `GET api/metrics`.
 *
 * 🛑 Las seis cifras son SIEMPRE números: así lo garantiza el back, y la página
 * cuenta con ello. Aun así nada aquí asume que la respuesta llegue —ver
 * `HeaderComponent`—, porque una portada que se queda en blanco si el API
 * tose es peor que una portada sin cifras.
 */
export interface ClarisaMetrics {
  institutions: number;
  projects: number;
  workPackages: number;
  countries: number;
  initiatives: number;
  controlLists: number;
  /** ISO-8601 UTC. La respuesta se cachea una hora en el servidor. */
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  constructor(private readonly http: HttpClient) {}

  /**
   * 🛑 Esto es lo que sustituye a contar por los endpoints públicos. Pedir
   * `api/institutions` solo para saber cuántas hay cuesta ~4,7 MB; esta
   * respuesta pesa menos que el texto de esta frase.
   */
  find(): Observable<ClarisaMetrics> {
    return this.http.get<ClarisaMetrics>(`${environment.apiUrl}api/metrics`);
  }
}

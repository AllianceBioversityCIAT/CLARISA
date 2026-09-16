import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, retry, timeout, timer } from 'rxjs';

import { EndpointsInformationService } from '../../../../../../../documentation/services/endpoints-information.service';

@Component({
  selector: 'app-list-institution',
  templateUrl: './list-institution.component.html',
  styleUrls: ['./list-institution.component.scss']
})
export class ListInstitutionComponent implements OnInit, OnDestroy {
  /**
   * Campos que recorre el buscador global.
   *
   * La tabla ya no se arma desde un arreglo de columnas genérico: cada columna
   * se declara en la plantilla, que es donde se ve qué se está pintando. Esta
   * lista se queda porque `p-table` la necesita literal.
   */
  findColumns: string[] = ['code', 'acronym', 'name', 'institutionType.name', 'websiteLink'];
  loading: boolean = true;
  informationEndpoint: any;

  /** La descarga no llegó. Con esto la pantalla lo dice y ofrece reintentar. */
  failed = false;

  /** Está tardando: se avisa de que el catálogo es grande, en vez de callar. */
  slow = false;

  /**
   * Qué falló exactamente, en una línea. Se enseña porque «no se pudo cargar» a
   * secas obliga a abrir las herramientas del navegador para saber si fue la red,
   * la sesión o el servidor.
   */
  reason = '';

  /**
   * Cuánto se espera antes de admitir que va lento. No es un tiempo de espera
   * máximo: la petición sigue viva, porque con una conexión lenta cortarla sería
   * romper lo único que estaba funcionando.
   */
  private static readonly SLOW_AFTER_MS = 6000;

  /**
   * Y este sí corta. No es un tiempo de espera ajustado a la descarga —4,7 MB
   * por una conexión mala tardan de sobra—, sino el punto a partir del cual una
   * petición que ni responde ni falla es un cuelgue: sin él, el girador vuelve a
   * ser eterno por otro camino.
   */
  private static readonly GIVE_UP_AFTER_MS = 90000;

  private request?: Subscription;
  private slowTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private _manageApiService: EndpointsInformationService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.stopWaiting();
    this.request?.unsubscribe();
  }

  /**
   * Trae el catálogo de instituciones.
   *
   * 🛑 Por qué esto no era un `subscribe` de una línea: el endpoint devuelve el
   * catálogo entero —4,7 MB, ~10 000 instituciones— y no acepta paginación
   * (`?page`/`?limit` devuelven exactamente lo mismo, medido el 16-sep-2026).
   * Cuando esa descarga se corta —VPN, red que cambia, pestaña recargada en mal
   * momento— el `subscribe` original no tenía rama de error, así que `loading`
   * se quedaba en `true` y la pantalla mostraba un girador eterno sobre «0
   * institutions» sin decir nunca que algo había fallado. Entrando otra vez sí
   * cargaba, porque el servidor responde 304 a la revalidación y la segunda
   * petición pesa 0 bytes: de ahí que pareciera que «solo carga si cambio de
   * sección y vuelvo» (reportado por Yeck, 16-sep-2026).
   *
   * Un reintento automático cubre el corte puntual, que es el caso común; si el
   * segundo también falla se le dice al usuario y se le deja el botón.
   */
  load(): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.failed = false;
    this.reason = '';
    this.startWaiting();

    this.request = this._manageApiService
      .getAnyEndpoint('api/institutions')
      .pipe(timeout(ListInstitutionComponent.GIVE_UP_AFTER_MS), retry({ count: 1, delay: () => timer(1200) }))
      .subscribe({
        next: resp => {
          this.informationEndpoint = resp;
          this.loading = false;
          this.stopWaiting();
        },
        error: error => {
          this.loading = false;
          this.failed = true;
          this.reason = ListInstitutionComponent.describe(error);
          this.stopWaiting();
        }
      });
  }

  /**
   * Traduce el fallo a una línea que se pueda leer sin abrir la consola. El
   * `status: 0` de Angular no significa «error 0»: significa que la petición no
   * llegó a tener respuesta —red caída, servidor inalcanzable o petición
   * cancelada—, y decirlo así ahorra media hora de búsqueda.
   */
  private static describe(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'The request never reached the server (network, VPN or a cancelled request).';
      }
      return `The server answered ${error.status}${error.statusText ? ' ' + error.statusText : ''}.`;
    }

    if (error && (error as { name?: string }).name === 'TimeoutError') {
      return 'The server did not answer within 90 seconds.';
    }

    return 'Unexpected error while downloading the catalogue.';
  }

  /**
   * El aviso de lentitud se cuenta fuera de Angular: dentro, un temporizador
   * pendiente deja esperando para siempre a cualquier prueba que use `fakeAsync`
   * o `whenStable`, y este es un detalle de presentación, no de datos.
   */
  private startWaiting(): void {
    this.stopWaiting();
    this.slow = false;
    this.zone.runOutsideAngular(() => {
      this.slowTimer = setTimeout(() => {
        if (this.loading) {
          this.zone.run(() => (this.slow = true));
        }
      }, ListInstitutionComponent.SLOW_AFTER_MS);
    });
  }

  private stopWaiting(): void {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = undefined;
    }
    this.slow = false;
  }
}

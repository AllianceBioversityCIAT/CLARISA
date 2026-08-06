import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * Documentacion de API custom de CLARISA.
 *
 * Se monta dentro de un IFRAME (assets/api-reference/index.html) para AISLAR la
 * doc del CSS global del template CLARISA (Bootstrap/PrimeNG), que de otro modo
 * deforma sus inputs/botones. La app del iframe consume el spec OpenAPI
 * (`${apiUrl}api-docs-json`, zero-leak) y la data en vivo de cada control list,
 * por eso recibe la URL base del API por query param `?api=`.
 *
 * El parametro opcional de ruta `:group` acota la vista a UN grupo del
 * catalogo, para que las paginas del menu publico ("One CGIAR Control List" y
 * "One CGIAR Operation") usen esta misma UI mostrando solo lo suyo. El iframe
 * normaliza el valor a slug, asi que `One_CGIAR_Operation` y
 * `one-cgiar-operation` son equivalentes; un grupo desconocido cae al catalogo
 * completo en vez de dejar la pagina vacia.
 */
@Component({
  selector: 'app-api-reference',
  templateUrl: './api-reference.component.html',
  styleUrls: ['./api-reference.component.scss']
})
export class ApiReferenceComponent implements OnInit, OnDestroy {
  /** Pagina aislada de la doc, con la URL base del API pasada por query param. */
  iframeUrl: SafeResourceUrl;

  private routeSubscription?: Subscription;

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly route: ActivatedRoute
  ) {
    this.iframeUrl = this.buildUrl(null);
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.iframeUrl = this.buildUrl(params.get('group'));
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private buildUrl(group: string | null): SafeResourceUrl {
    const params = [`api=${encodeURIComponent(environment.apiUrl)}`];

    if (group) {
      params.push(`group=${encodeURIComponent(group)}`);
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(`assets/api-reference/index.html?${params.join('&')}`);
  }
}

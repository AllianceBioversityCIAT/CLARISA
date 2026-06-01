import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

/**
 * PROPUESTA (no reemplaza la documentacion actual).
 *
 * Renderiza dinamicamente el spec OpenAPI que el back expone en
 * `${apiUrl}api-docs-json` (Swagger autogenerado desde los controllers/DTOs).
 *
 * Se monta dentro de un IFRAME (assets/api-reference/index.html) para AISLAR
 * Scalar del CSS global del template CLARISA (Bootstrap/PrimeNG), que de otro
 * modo deforma sus inputs/botones. El iframe usa Scalar por CDN, asi que no se
 * agregan dependencias al package.json mientras es propuesta.
 */
@Component({
  selector: 'app-api-reference',
  templateUrl: './api-reference.component.html',
  styleUrls: ['./api-reference.component.scss'],
})
export class ApiReferenceComponent {
  /** URL del spec OpenAPI servido por el back. */
  specUrl = `${environment.apiUrl}api-docs-json`;

  /** Pagina aislada de Scalar, con el spec pasado por query param. */
  iframeUrl: SafeResourceUrl;

  constructor(sanitizer: DomSanitizer) {
    const url = `assets/api-reference/index.html?spec=${encodeURIComponent(
      this.specUrl
    )}`;
    this.iframeUrl = sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

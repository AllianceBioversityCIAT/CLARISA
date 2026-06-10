import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

/**
 * Documentacion de API custom de CLARISA.
 *
 * Se monta dentro de un IFRAME (assets/api-reference/index.html) para AISLAR la
 * doc del CSS global del template CLARISA (Bootstrap/PrimeNG), que de otro modo
 * deforma sus inputs/botones. La app del iframe consume el spec OpenAPI
 * (`${apiUrl}api-docs-json`, zero-leak) y la data en vivo de cada control list,
 * por eso recibe la URL base del API por query param `?api=`.
 */
@Component({
  selector: 'app-api-reference',
  templateUrl: './api-reference.component.html',
  styleUrls: ['./api-reference.component.scss'],
})
export class ApiReferenceComponent {
  /** Pagina aislada de la doc, con la URL base del API pasada por query param. */
  iframeUrl: SafeResourceUrl;

  constructor(sanitizer: DomSanitizer) {
    const url = `assets/api-reference/index.html?api=${encodeURIComponent(
      environment.apiUrl
    )}`;
    this.iframeUrl = sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

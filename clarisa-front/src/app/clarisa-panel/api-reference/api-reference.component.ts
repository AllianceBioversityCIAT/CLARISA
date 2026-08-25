import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

/** Message the embedded documentation posts when the user navigates inside it. */
interface DocsNavigationMessage {
  type: 'clarisa-docs:navigate';
  path: string[];
}

/**
 * Documentacion de API custom de CLARISA.
 *
 * Se monta dentro de un IFRAME (assets/api-reference/index.html) para AISLAR la
 * doc del CSS global del template CLARISA (Bootstrap/PrimeNG), que de otro modo
 * deforma sus inputs/botones. La app del iframe consume el spec OpenAPI
 * (`${apiUrl}api-docs-json`, zero-leak) y la data en vivo de cada control list,
 * por eso recibe la URL base del API por query param `?api=`.
 *
 * URLs: conserva la jerarquia publica de siempre —
 * `documentation/<grupo>/<categoria>/<endpoint>`— para que los enlaces ya
 * compartidos y los redirects legacy de swagger sigan resolviendo. La ruta se
 * traduce a query params del iframe, y el iframe avisa por postMessage cuando
 * el usuario navega, para reflejarlo en la barra de direcciones sin recargar.
 */
@Component({
  selector: 'app-api-reference',
  templateUrl: './api-reference.component.html',
  styleUrls: ['./api-reference.component.scss'],
})
export class ApiReferenceComponent implements OnInit, OnDestroy {
  /** Pagina aislada de la doc, con la URL base del API pasada por query param. */
  iframeUrl: SafeResourceUrl;

  private routeSubscription?: Subscription;

  /**
   * Last path this component wrote to the address bar on behalf of the iframe.
   * Used to tell "the user navigated inside the docs" (do not reload the frame)
   * apart from "the URL changed from outside" (rebuild the frame).
   */
  private pathWrittenFromFrame: string | null = null;

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.iframeUrl = this.buildUrl(null, null, null);
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const group = params.get('group');
      const category = params.get('category');
      const endpoint = params.get('endpoint');

      const path = [group, category, endpoint].filter(Boolean).join('/');
      if (path && path === this.pathWrittenFromFrame) {
        // The iframe caused this URL change; reloading it would undo the
        // user's navigation.
        return;
      }

      this.iframeUrl = this.buildUrl(group, category, endpoint);
    });

    window.addEventListener('message', this.onFrameMessage);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    window.removeEventListener('message', this.onFrameMessage);
  }

  private onFrameMessage = (event: MessageEvent): void => {
    // The frame is served from our own assets, so anything from another origin
    // is not ours.
    if (event.origin !== window.location.origin) {
      return;
    }

    const message = event.data as DocsNavigationMessage;
    if (message?.type !== 'clarisa-docs:navigate' || !Array.isArray(message.path)) {
      return;
    }

    const segments = message.path.filter((segment) => !!segment);
    this.pathWrittenFromFrame = segments.join('/');

    this.router.navigate(['/clarisa-panel/documentation', ...segments], {
      replaceUrl: true,
    });
  };

  private buildUrl(
    group: string | null,
    category: string | null,
    endpoint: string | null
  ): SafeResourceUrl {
    const params = [`api=${encodeURIComponent(environment.apiUrl)}`];

    if (group) {
      params.push(`group=${encodeURIComponent(group)}`);
    }
    if (category) {
      params.push(`category=${encodeURIComponent(category)}`);
    }
    if (endpoint) {
      params.push(`endpoint=${encodeURIComponent(endpoint)}`);
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `assets/api-reference/index.html?${params.join('&')}`
    );
  }
}

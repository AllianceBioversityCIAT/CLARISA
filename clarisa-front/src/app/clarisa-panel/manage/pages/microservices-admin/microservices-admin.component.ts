import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

export type AdminSection = 'api-keys' | 'usage' | 'mises';

const SECTIONS: AdminSection[] = ['api-keys', 'usage', 'mises'];
const DEFAULT_SECTION: AdminSection = SECTIONS[0];

/**
 * La pestaña ya no la elige un sidebar propio (columna blanca al lado del
 * menú negro): la elige el menú negro mismo, con un `?section=` sobre esta
 * misma ruta — así la pestaña sobrevive a un refresco y se puede enlazar
 * directo (Yeck, 23-sep-2026).
 */
@Component({
  selector: 'app-microservices-admin',
  templateUrl: './microservices-admin.component.html',
  styleUrls: ['./microservices-admin.component.scss'],
})
export class MicroservicesAdminComponent implements OnDestroy {
  activeSection: AdminSection = DEFAULT_SECTION;

  private readonly params: Subscription;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.params = this.route.queryParamMap.subscribe(params => {
      const section = params.get('section');

      if ((SECTIONS as string[]).includes(section ?? '')) {
        this.activeSection = section as AdminSection;
        return;
      }

      // /* Sin `?section=` el panel igual abre en «API Keys», pero la URL se
      // quedaba muda al respecto y el menú de la izquierda no tenía nada que
      // resaltar como activo. Se corrige la URL, no se pinta un estado falso.
      this.activeSection = DEFAULT_SECTION;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: DEFAULT_SECTION },
        replaceUrl: true
      });
    });
  }

  ngOnDestroy(): void {
    this.params.unsubscribe();
  }
}

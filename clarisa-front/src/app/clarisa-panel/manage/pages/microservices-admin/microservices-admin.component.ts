import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

export type AdminSection = 'overview' | 'mises' | 'api-keys';

export interface AdminSectionTab {
  id: AdminSection;
  label: string;
  hint: string;
}

/**
 * Orden del flujo, el mismo del menú negro (`admin-nav.ts`): primero qué está
 * pasando, después los sistemas registrados, al final las llaves que les
 * pertenecen (Yeck, 24-sep-2026).
 */
export const SECTION_TABS: AdminSectionTab[] = [
  { id: 'overview', label: 'Overview', hint: 'Who uses CLARISA, and how much' },
  { id: 'mises', label: 'MIS Registry', hint: 'The systems that hold keys' },
  { id: 'api-keys', label: 'API Keys', hint: 'Create, edit, rotate, and revoke keys' }
];

const SECTIONS: AdminSection[] = SECTION_TABS.map(tab => tab.id);
const DEFAULT_SECTION: AdminSection = 'overview';

/** Enlaces viejos: «Usage & Analytics» era `?section=usage` hasta el 24-sep-2026. */
const SECTION_ALIASES: Record<string, AdminSection> = { usage: 'overview' };

/**
 * La pestaña la elige `?section=` sobre esta misma ruta: así sobrevive a un
 * refresco, se puede enlazar directo y el menú negro la resalta. El riel de
 * pestañas de arriba y las sub-entradas del menú escriben el mismo parámetro
 * (Yeck, 23-sep-2026 y 24-sep-2026).
 */
@Component({
  selector: 'app-microservices-admin',
  templateUrl: './microservices-admin.component.html',
  styleUrls: ['./microservices-admin.component.scss']
})
export class MicroservicesAdminComponent implements OnDestroy {
  readonly tabs = SECTION_TABS;
  activeSection: AdminSection = DEFAULT_SECTION;

  private readonly params: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.params = this.route.queryParamMap.subscribe(params => {
      const requested = params.get('section') ?? '';

      if ((SECTIONS as string[]).includes(requested)) {
        this.activeSection = requested as AdminSection;
        return;
      }

      // Sin `?section=` (o con uno viejo) el panel abre en Overview, y la URL
      // lo dice para que el menú tenga algo que resaltar. Se corrige la URL,
      // no se pinta un estado falso.
      this.activeSection = SECTION_ALIASES[requested] ?? DEFAULT_SECTION;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: this.activeSection },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
  }

  setSection(section: AdminSection): void {
    if (section === this.activeSection) {
      return;
    }
    // Solo cambia la pestaña: un `api_key` que venga de otra pestaña se queda
    // hasta que Overview lo lea, y el resto de la URL no se toca.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section },
      queryParamsHandling: 'merge'
    });
  }

  ngOnDestroy(): void {
    this.params.unsubscribe();
  }
}

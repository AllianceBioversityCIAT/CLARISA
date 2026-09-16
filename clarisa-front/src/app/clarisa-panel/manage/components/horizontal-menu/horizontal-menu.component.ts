import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../../shared/services/auth.service';
import { adminSectionLabel } from '../../admin-nav';

@Component({
  selector: 'app-horizontal-menu',
  templateUrl: './horizontal-menu.component.html',
  styleUrls: ['./horizontal-menu.component.scss']
})
export class HorizontalMenuComponent implements OnDestroy {
  /**
   * Sin el menú público, la izquierda de la barra quedaba vacía. La ocupa el
   * nombre de la sección abierta, que sale de `admin-nav.ts` — la misma lista
   * que pinta el sidebar, para que no puedan decir cosas distintas.
   */
  sectionLabel = HorizontalMenuComponent.FALLBACK;

  private static readonly FALLBACK = 'Administration';

  private readonly navigation: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.sectionLabel = adminSectionLabel(this.router.url) ?? HorizontalMenuComponent.FALLBACK;

    this.navigation = this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => {
      this.sectionLabel = adminSectionLabel(event.urlAfterRedirects) ?? HorizontalMenuComponent.FALLBACK;
    });
  }

  ngOnDestroy(): void {
    this.navigation.unsubscribe();
  }

  onLogOut() {
    this.authService.logout();
  }
}

import { Injectable, inject } from '@angular/core';
import { ClarityService } from './clarity.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
@Injectable({
  providedIn: 'root'
})
export class TrackingToolsService {
  clarity = inject(ClarityService);
  route = inject(ActivatedRoute);

  private readonly router = inject(Router);
  constructor() {
    this.init();
  }
  init() {
    this.initAllTools();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.updateAllTools(event.urlAfterRedirects);
    });
  }

  initAllTools() {
    this.clarity.init();
  }

  updateAllTools(url: string) {
    this.clarity.updateState(url);
  }
}

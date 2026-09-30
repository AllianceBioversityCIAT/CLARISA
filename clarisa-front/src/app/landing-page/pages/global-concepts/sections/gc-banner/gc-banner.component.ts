import { Component, Input } from '@angular/core';
import { AuthService } from '../../../../../shared/services/auth.service';
import { GC_BASE } from '../../global-concepts.utils';

export interface Crumb {
  label: string;
  link?: string;
}

/** The brand band of the section: same surface as the glossary banner. */
@Component({
  selector: 'app-gc-banner',
  templateUrl: './gc-banner.component.html',
  styleUrls: ['./gc-banner.component.scss']
})
export class GcBannerComponent {
  @Input() title = 'Concepts';
  @Input() eyebrow: string | null = null;
  @Input() crumbs: Crumb[] = [];
  /** The section's own navigation: browse, user guide, developers. */
  @Input() nav = true;

  readonly links = GC_NAV;
  readonly adminLink = GC_ADMIN_LINK;

  constructor(private readonly _auth: AuthService) {}

  /**
   * A signed-in curator reaches the admin side from here; the panel's own
   * guard still decides what they may do. A broken session just hides it.
   */
  get signedIn(): boolean {
    try {
      return !!this._auth.localStorageToken && !this._auth.isSessionExpired();
    } catch {
      return false;
    }
  }
}

export const GC_ADMIN_LINK = '/clarisa-panel/manage/concepts-admin';

/** Pages of the section, shared by the banner and the section footer. */
export const GC_NAV: { label: string; link: string; icon: string; exact: boolean }[] = [
  { label: 'Browse concepts', link: GC_BASE, icon: 'pi-search', exact: true },
  { label: 'User guide', link: `${GC_BASE}/guide`, icon: 'pi-book', exact: false },
  { label: 'Developers', link: `${GC_BASE}/developers`, icon: 'pi-code', exact: false }
];

import { Component, OnInit } from '@angular/core';
import { ConceptScheme, GlobalConceptsApiService } from '../../../../shared/services/global-concepts/global-concepts-api.service';
import { PanelAccessService } from '../../../../shared/services/access-admin/panel-access.service';
import { permits } from '../../../../shared/services/access-admin/access-rules';
import { MeAccess } from '../../../../shared/services/access-admin/access-admin-api.service';
import { CreateRequest } from './components/gc-concepts-panel/gc-concepts-panel.component';

export type GlobalConceptsSection = 'concepts' | 'requests' | 'import' | 'setup' | 'usage';

/** The only scheme today. The picker appears on its own once the back lists a second one. */
export const DEFAULT_SCHEME = 'meliaf-taxonomy';

const ALL_SECTIONS: { id: GlobalConceptsSection; label: string }[] = [
  { id: 'concepts', label: 'Concepts' },
  { id: 'requests', label: 'Requests' },
  { id: 'import', label: 'Import' },
  { id: 'setup', label: 'Setup' },
  { id: 'usage', label: 'Usage' }
];

/**
 * A back route only the full Concepts admin permission (`/api/meliaf-taxonomy/admin`)
 * opens: the concepts-only one (`…/admin/concepts`, role CONCEPTS_CE) is
 * not a substring of it. Same `route.includes(permission)` test as the back.
 */
export const CONCEPTS_FULL_ADMIN_ROUTE = '/api/meliaf-taxonomy/admin/requests';

/** Whether the caller may use Requests, Import, Setup and Usage, not only Concepts. */
export function isConceptsFullAdmin(access: MeAccess | null): boolean {
  return !!access && (access.isSuper || permits(CONCEPTS_FULL_ADMIN_ROUTE, access.permissions));
}

@Component({
  selector: 'app-global-concepts-admin',
  templateUrl: './global-concepts-admin.component.html',
  styleUrls: ['./global-concepts-admin.component.scss']
})
export class GlobalConceptsAdminComponent implements OnInit {
  activeSection: GlobalConceptsSection = 'concepts';
  scheme = DEFAULT_SCHEME;
  schemeOptions: { label: string; value: string }[] = [];

  /**
   * AI is advisory and optional. Until the status answers — or if it fails —
   * the AI buttons stay hidden and every screen works by hand.
   */
  aiEnabled = false;

  /** Bumped after an import so the concepts table reloads when it is opened. */
  conceptsReloadToken = 0;

  /**
   * Full admin (all tabs) or concepts-only (CONCEPTS_CE). Until the access
   * answers — or if it fails — only Concepts shows: the other tabs would only
   * collect 403s, and the back refuses them anyway.
   */
  fullAdmin = false;

  get sections(): { id: GlobalConceptsSection; label: string }[] {
    return this.fullAdmin ? ALL_SECTIONS : ALL_SECTIONS.filter(section => section.id === 'concepts');
  }

  /** A search nobody found, sent from Usage: the Concepts tab opens its create dialog with it. */
  createRequest: CreateRequest | null = null;
  /** Kept apart from `createRequest`, which is cleared once used: tokens never repeat. */
  private createToken = 0;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _access: PanelAccessService
  ) {}

  ngOnInit(): void {
    this._access.resolved().subscribe(access => {
      this.fullAdmin = isConceptsFullAdmin(access);
      if (!this.fullAdmin) this.activeSection = 'concepts';
    });

    this._api.schemes().subscribe({
      next: schemes => {
        const list = Array.isArray(schemes) ? schemes : [];
        this.schemeOptions = list.map((scheme: ConceptScheme) => ({ label: scheme.title || scheme.code, value: scheme.code }));
        if (list.length && !list.some(scheme => scheme.code === this.scheme)) {
          this.scheme = list[0].code;
        }
      },
      // Without the list the default scheme still works; the picker simply does not show.
      error: () => (this.schemeOptions = [])
    });

    // `ai/status` is outside the concepts path: a concepts-only member gets a
    // 403 here, AI stays off and the editor works by hand.
    this._api.aiStatus().subscribe({
      next: status => (this.aiEnabled = !!status?.enabled),
      error: () => (this.aiEnabled = false)
    });
  }

  get showSchemePicker(): boolean {
    return this.schemeOptions.length > 1;
  }

  setSection(section: GlobalConceptsSection): void {
    if (!this.sections.some(item => item.id === section)) return;
    this.activeSection = section;
  }

  /** "Create concept" from a search with no result: switch to Concepts and open the dialog prefilled. */
  createFromSearch(label: string): void {
    this.createRequest = { label, token: ++this.createToken };
    this.activeSection = 'concepts';
  }

  /** The panel opened the dialog: forget the request, or the next panel instance (after a tab switch) opens it again. */
  onCreateHandled(token: number): void {
    if (this.createRequest?.token === token) this.createRequest = null;
  }

  /** The wizard stays on its result step; the concepts table is marked stale. */
  onImported(): void {
    this.conceptsReloadToken++;
  }
}

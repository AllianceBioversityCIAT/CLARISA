import { Component, OnInit } from '@angular/core';
import { ConceptScheme, GlobalConceptsApiService } from '../../../../shared/services/global-concepts/global-concepts-api.service';

export type GlobalConceptsSection = 'concepts' | 'requests' | 'import';

/** The only scheme today. The picker appears on its own once the back lists a second one. */
export const DEFAULT_SCHEME = 'meliaf';

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

  constructor(private readonly _api: GlobalConceptsApiService) {}

  ngOnInit(): void {
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

    this._api.aiStatus().subscribe({
      next: status => (this.aiEnabled = !!status?.enabled),
      error: () => (this.aiEnabled = false)
    });
  }

  get showSchemePicker(): boolean {
    return this.schemeOptions.length > 1;
  }

  setSection(section: GlobalConceptsSection): void {
    this.activeSection = section;
  }

  /** The wizard stays on its result step; the concepts table is marked stale. */
  onImported(): void {
    this.conceptsReloadToken++;
  }
}

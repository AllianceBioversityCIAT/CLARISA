import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ConceptHistoryEntry,
  ConceptLabel,
  ConceptRef,
  GlobalConceptsApiService,
  PublicConceptV2,
  PublicFieldDef
} from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { DEFAULT_SCHEME, GC_BASE, conceptLink, ListsByCode, dateLabel, humanError, labelOf, normalizeLists, safeHttpUrl } from '../../global-concepts.utils';

/** Public names of the history actions (`GcHistoryAction` in the back). */
const ACTIONS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  direct_edit: 'Edited',
  status: 'Status changed',
  labels: 'Labels changed',
  relations: 'Relations changed',
  mappings: 'Mappings changed',
  icons: 'Icon changed',
  merge: 'Merged',
  import: 'Imported',
  request_applied: 'Change request applied'
};

const LABEL_KINDS: Record<string, string> = { alt: 'Alternative', hidden: 'Search term', acronym: 'Acronym', pref: 'Preferred' };

@Component({
  selector: 'app-gc-concept-detail',
  templateUrl: './concept-detail.component.html',
  styleUrls: ['./concept-detail.component.scss'],
  // The shared Global Concepts kit is declared once, globally (src/styles/_global-concepts.scss).
  host: { class: 'gc-kit' }
})
export class ConceptDetailComponent implements OnInit, OnDestroy {
  readonly base = GC_BASE;

  schemeCode = DEFAULT_SCHEME;
  termId = 0;
  concept: PublicConceptV2 | null = null;
  /** Public field definitions: only used to name list values of custom fields. */
  fieldDefs: PublicFieldDef[] = [];
  history: ConceptHistoryEntry[] = [];
  historyError = false;
  lists: ListsByCode = {};
  loading = true;
  error: string | null = null;
  copied = false;
  proposeOpen = false;

  private readonly destroy$ = new Subject<void>();
  /** Bumped on each load: an answer for a concept the reader already left is dropped. */
  private loadToken = 0;

  constructor(
    private _api: GlobalConceptsApiService,
    private _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // The same component serves every concept: following a related link only
    // changes the params, so the page reloads on each change.
    this._route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.schemeCode = (params.get('scheme') || DEFAULT_SCHEME).toLowerCase();
      this.termId = Number(params.get('termId'));
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.concept = null;
    this.fieldDefs = [];
    this.history = [];
    this.historyError = false;
    this.error = null;
    this.copied = false;
    this.proposeOpen = false;

    if (!Number.isInteger(this.termId) || this.termId < 1) {
      this.loading = false;
      this.error = 'This link does not point to a concept. Open it from the MELIAF taxonomy list.';
      return;
    }

    this.loading = true;
    const token = ++this.loadToken;
    const current = () => token === this.loadToken;
    this._api
      .concept(this.schemeCode, this.termId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: concept => {
          if (!current()) return;
          this.concept = concept;
          this.loading = false;
        },
        error: (error: HttpErrorResponse) => {
          if (!current()) return;
          this.loading = false;
          this.error = humanError(error, {
            notFound: `TERM ${this.termId} is not a published concept of this scheme. It may still be under review, or the link may be incomplete.`
          });
        }
      });
    this._api
      .history(this.schemeCode, this.termId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rows => {
          if (current()) this.history = [...(rows ?? [])].reverse();
        },
        error: () => {
          if (current()) this.historyError = true;
        }
      });
    this._api
      .publicFields(this.schemeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: defs => {
          if (current()) this.fieldDefs = Array.isArray(defs) ? defs : [];
        },
        // Optional: without it custom list values show their code.
        error: () => {
          if (current()) this.fieldDefs = [];
        }
      });
    this._api
      .lists(this.schemeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: raw => {
          if (current()) this.lists = normalizeLists(raw);
        },
        error: () => {
          if (current()) this.lists = {};
        }
      });
  }

  /** Whether a field of this concept was drafted with AI assistance (contract-v2 § 4). */
  ai(field: string): boolean {
    return !!this.concept?.ai_generated_fields?.includes(field);
  }

  /** The AI-assisted fields, named for a reader. */
  get aiFieldNames(): string[] {
    const custom = new Map((this.concept?.custom_fields ?? []).map(f => [f.code, f.label]));
    return (this.concept?.ai_generated_fields ?? []).map(f => custom.get(f) ?? f.replace(/_/g, ' '));
  }

  get isDeprecated(): boolean {
    return this.concept?.status === 'deprecated';
  }

  label(code: string, value: string | null | undefined): string {
    return labelOf(this.lists, code, value);
  }

  link(ref: ConceptRef): (string | number)[] {
    return conceptLink(this.schemeCode, ref.term_id);
  }

  safeUrl(url: string | null | undefined): string | null {
    return safeHttpUrl(url);
  }

  date(value: string | null | undefined): string {
    return dateLabel(value);
  }

  labelKind(label: ConceptLabel): string {
    return LABEL_KINDS[label.kind] ?? label.kind;
  }

  actionLabel(action: string): string {
    return ACTIONS[action] ?? action.replace(/_/g, ' ');
  }

  /** Names of the fields a history entry changed, readable. */
  changedFields(entry: ConceptHistoryEntry): string[] {
    return Object.keys(entry.changes ?? {}).map(field => field.replace(/_/g, ' '));
  }

  get phases(): string[] {
    const concept = this.concept;
    if (!concept) return [];
    return [concept.phase_primary, ...(concept.phase_also ?? [])].filter((phase): phase is string => !!phase);
  }

  get hasRelations(): boolean {
    const c = this.concept;
    return !!c && (c.broader_terms?.length > 0 || c.narrower_terms?.length > 0 || c.related_terms?.length > 0);
  }

  copyUri(): void {
    const uri = this.concept?.term_uri;
    if (!uri) return;
    const done = () => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2400);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(uri).then(done, () => this.copyFallback(uri, done));
    } else {
      this.copyFallback(uri, done);
    }
  }

  private copyFallback(uri: string, done: () => void): void {
    const area = document.createElement('textarea');
    area.value = uri;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      if (document.execCommand('copy')) done();
    } finally {
      document.body.removeChild(area);
    }
  }

  openPropose(): void {
    this.proposeOpen = true;
    setTimeout(() => document.getElementById('gc-propose')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

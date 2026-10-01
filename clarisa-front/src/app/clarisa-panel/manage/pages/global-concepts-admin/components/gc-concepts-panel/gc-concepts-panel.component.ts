import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import {
  AdminConceptDetail,
  ConceptStatus,
  CustomField,
  GlobalConceptsApiService
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import {
  ConceptFilters,
  emptyFilters,
  FilterChip,
  filterChips,
  hasIcon,
  IconFilter,
  matchesFilters,
  matchesText,
  removeChip
} from '../../utils/concept-filters';
import { STATUS_LABELS, statusSeverity } from '../../utils/concept-form';
import { activeFields, customCellText } from '../../utils/custom-fields';
import { groupLists, ListOption, listLabel } from '../../utils/list-values';
import { GcConceptDialogComponent } from '../gc-concept-dialog/gc-concept-dialog.component';
import { GcConceptCreateDialogComponent } from '../gc-concept-create-dialog/gc-concept-create-dialog.component';

// The form helpers moved to utils/concept-form; re-exported so existing imports keep working.
export { buildConceptBody, emptyForm, formFromConcept, STATUS_LABELS, statusSeverity } from '../../utils/concept-form';
export type { ConceptForm } from '../../utils/concept-form';

/** A table row: flat, so every column sorts on the value it shows. */
export interface ConceptRow {
  concept: AdminConceptDetail;
  term_id: number;
  preferred_label: string;
  definition: string;
  status: ConceptStatus;
  functions: string[];
  /** The function labels joined, which is what the Functions column sorts by. */
  functionsText: string;
  version: string;
  date_modified: string;
  /** 1 with an icon, 0 without: the Icon column sorts on it. */
  icon: number;
  /** Display text of each custom field, by field code: the optional columns show and sort on it. */
  x: Record<string, string>;
}

/** Remembered per browser; a missing or blocked storage just starts with no extra columns. */
const COLUMNS_KEY = 'gc-concepts-columns';

/** Pause after the last keystroke before the back ranks the search, in ms. The local match is instant. */
const SEARCH_DEBOUNCE_MS = 250;

interface SearchAnswer {
  q: string;
  /** term_id → position in the back's ranking; null when the back did not answer. */
  rank: Map<number, number> | null;
}

/** A request to open the create dialog with a label, from the Usage tab. The token makes the same label open twice. */
export interface CreateRequest {
  label: string;
  token: number;
}

@Component({
  selector: 'app-gc-concepts-panel',
  templateUrl: './gc-concepts-panel.component.html',
  styleUrls: ['./gc-concepts-panel.component.scss']
})
export class GcConceptsPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() scheme = 'meliaf-taxonomy';

  /** The Export dialog: format + version, the same files as the public Download. */
  exportOpen = false;
  /** Bumped by the shell after an import. */
  @Input() reloadToken = 0;
  @Input() aiEnabled = false;
  @Input() createRequest: CreateRequest | null = null;
  /** The create request was used: the shell clears it, so a recreated panel does not open it again. */
  @Output() createHandled = new EventEmitter<number>();
  @ViewChild(GcConceptDialogComponent) dialog?: GcConceptDialogComponent;
  /** «New concept» asks only the basics here; the full editor opens on the result. */
  @ViewChild(GcConceptCreateDialogComponent) createDialog?: GcConceptCreateDialogComponent;

  loading = false;
  loadError: string | null = null;
  concepts: AdminConceptDetail[] = [];
  rows: ConceptRow[] = [];
  lists: Record<string, ListOption[]> = {};
  /** Active custom fields: each one can be switched on as a table column. */
  customFields: CustomField[] = [];
  /** Codes of the custom-field columns switched on. */
  shownFields: string[] = [];
  /** Kept as fields, not getters: a new array on every check re-renders the picker under the click. */
  fieldColumnOptions: { label: string; value: string }[] = [];
  /** The switched-on columns, in the fields' own order. */
  shownColumns: CustomField[] = [];

  filters: ConceptFilters = emptyFilters();
  chips: FilterChip[] = [];
  showMoreFilters = false;
  readonly statusChoices = (Object.keys(STATUS_LABELS) as ConceptStatus[]).map(value => ({ label: STATUS_LABELS[value], value }));
  readonly iconChoices: { label: string; value: IconFilter }[] = [
    { label: 'Any', value: 'any' },
    { label: 'With icon', value: 'with' },
    { label: 'Without', value: 'without' }
  ];

  // --- text search -------------------------------------------------------
  // The search box ranks with the same text search as the public list (exact
  // phrase, then every word in any order, then close words by similarity),
  // done by the back so both lists answer alike. No AI is involved.
  /** term_id → position in the ranking of `searchFor`; null while there is none. */
  searchRank: Map<number, number> | null = null;
  /** The query `searchRank` answers. */
  private searchFor = '';
  /** The back could not rank the last query: the table shows the plain local match. */
  searchFailed = false;
  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;

  private handledCreateToken: number | null = null;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.searchSub = this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap(q => this.rankSearch(q))
      )
      .subscribe(answer => this.applySearch(answer));
    this.load();
    this.loadLists();
    this.loadFields();
    this.handleCreateRequest();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = ['scheme', 'reloadToken'].some(key => changes[key] && !changes[key].firstChange);
    if (changed) {
      this.load();
      if (changes['scheme'] && !changes['scheme'].firstChange) {
        this.loadLists();
        this.loadFields();
      }
    }
    if (changes['createRequest'] && !changes['createRequest'].firstChange) this.handleCreateRequest();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  /** The dialog is a view child: it exists after the first change detection, so the open waits one tick. */
  private handleCreateRequest(): void {
    const request = this.createRequest;
    if (!request || request.token === this.handledCreateToken) return;
    this.handledCreateToken = request.token;
    setTimeout(() => {
      this.openCreate(request.label);
      this.createHandled.emit(request.token);
    });
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this._api.adminConcepts(this.scheme).subscribe({
      next: concepts => {
        this.loading = false;
        this.concepts = (Array.isArray(concepts) ? concepts : []) as AdminConceptDetail[];
        this.applyFilters();
        // A concept created or edited since the last ranking must be ranked too.
        if (this.filters.search.trim()) this.search$.next(this.filters.search.trim());
      },
      error: error => {
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The concepts could not be loaded');
      }
    });
  }

  private loadLists(): void {
    this._api.lists(this.scheme).subscribe({
      next: response => {
        this.lists = groupLists(response);
        // The Functions column shows labels, which only exist once the lists arrive.
        this.applyFilters();
      },
      error: error => this.toastError(error, 'The controlled lists could not be loaded; the list fields stay empty')
    });
  }

  private loadFields(): void {
    this._api.conceptFields(this.scheme).subscribe({
      next: fields => {
        this.customFields = activeFields(Array.isArray(fields) ? fields : []);
        const known = new Set(this.customFields.map(field => field.code));
        this.fieldColumnOptions = this.customFields.map(field => ({ label: field.label, value: field.code }));
        this.shownFields = this.readShownFields().filter(code => known.has(code));
        this.syncColumns();
        this.applyFilters();
      },
      error: error => this.toastError(error, 'The custom fields could not be loaded; their columns are not available')
    });
  }

  // ------------------------------------------------------------ columns

  onColumnsChange(): void {
    this.syncColumns();
    try {
      localStorage.setItem(`${COLUMNS_KEY}:${this.scheme}`, JSON.stringify(this.shownFields));
    } catch {
      // Storage blocked: the choice lasts until the page closes.
    }
  }

  private syncColumns(): void {
    this.shownColumns = this.customFields.filter(field => this.shownFields.includes(field.code));
  }

  private readShownFields(): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(`${COLUMNS_KEY}:${this.scheme}`) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(code => typeof code === 'string') : [];
    } catch {
      return [];
    }
  }

  // ------------------------------------------------------------ filters

  applyFilters(): void {
    const q = this.filters.search.trim();
    const rank = q && this.searchFor === q ? this.searchRank : null;
    let concepts = this.concepts.filter(concept => matchesFilters(concept, this.filters));
    if (rank) {
      concepts = concepts.filter(concept => rank.has(concept.term_id)).sort((a, b) => (rank.get(a.term_id) ?? 0) - (rank.get(b.term_id) ?? 0));
    } else if (q) {
      // Until the ranking arrives (or when the back fails): the plain local match, so typing never shows an empty table.
      concepts = concepts.filter(concept => matchesText(concept, q));
    }
    this.rows = concepts.map(concept => this.toRow(concept));
    this.chips = filterChips(this.filters, this.lists);
  }

  /** The table is sorted by best match while a ranking is shown, alphabetically otherwise. */
  get ranked(): boolean {
    return !!this.searchRank && this.searchFor === this.filters.search.trim();
  }

  /** The search box changed: the local match shows at once, the back's ranking follows. */
  onSearchChange(): void {
    const q = this.filters.search.trim();
    if (!q) {
      this.searchRank = null;
      this.searchFor = '';
      this.searchFailed = false;
    }
    this.applyFilters();
    if (q) this.search$.next(q);
  }

  private rankSearch(q: string): Observable<SearchAnswer> {
    return this._api.adminConcepts(this.scheme, undefined, q).pipe(
      map(found => ({ q, rank: new Map((Array.isArray(found) ? found : []).map((concept, i) => [concept.term_id, i])) })),
      catchError(() => of({ q, rank: null }))
    );
  }

  private applySearch(answer: SearchAnswer): void {
    // An answer for a query the reader already changed is dropped.
    if (answer.q !== this.filters.search.trim()) return;
    this.searchFor = answer.q;
    this.searchRank = answer.rank;
    this.searchFailed = answer.rank === null;
    this.applyFilters();
  }

  removeFilter(chip: FilterChip): void {
    this.filters = removeChip(this.filters, chip);
    this.onSearchChange();
  }

  clearFilters(): void {
    this.filters = emptyFilters();
    this.onSearchChange();
  }

  get hasFilters(): boolean {
    return this.chips.length > 0;
  }

  /** How many of the secondary filters are on, for the badge of the "More filters" button. */
  get moreFiltersCount(): number {
    return (
      (this.filters.icon !== 'any' ? 1 : 0) + (this.filters.missingDefinition ? 1 : 0) + this.filters.termTypes.length + this.filters.phases.length
    );
  }

  private toRow(concept: AdminConceptDetail): ConceptRow {
    const functions = (concept.functions ?? []).map(value => listLabel(this.lists, 'functions', value));
    return {
      concept,
      term_id: concept.term_id,
      preferred_label: concept.preferred_label ?? '',
      definition: concept.definition ?? '',
      status: concept.status,
      functions,
      functionsText: functions.join(', '),
      version: concept.version ?? '',
      date_modified: concept.date_modified ?? '',
      icon: hasIcon(concept) ? 1 : 0,
      x: Object.fromEntries(this.customFields.map(field => [field.code, customCellText(field, concept.extra, this.lists, id => this.labelOf(id))]))
    };
  }

  private labelOf(termId: number): string | undefined {
    return this.concepts.find(concept => concept.term_id === termId)?.preferred_label ?? undefined;
  }

  statusLabel(status: ConceptStatus | string): string {
    return STATUS_LABELS[status as ConceptStatus] ?? status;
  }

  statusSeverity(status: ConceptStatus | string): string {
    return statusSeverity(status as ConceptStatus);
  }

  optionsFor(code: string): ListOption[] {
    return this.lists[code] ?? [];
  }

  // ------------------------------------------------------------- dialog

  /** Short form first (label, definition, optional TERM ID); the full editor opens once the concept exists. */
  openCreate(label = ''): void {
    this.createDialog?.open(label);
  }

  /** The short form created the concept: the table learns about it, and the full editor opens on it with every tab unlocked. */
  onCreated(concept: AdminConceptDetail | null | undefined): void {
    this.load();
    if (concept?.term_id) this.dialog?.openEdit(concept);
  }

  openEdit(concept: AdminConceptDetail | null): void {
    if (concept) this.dialog?.openEdit(concept);
  }

  private toastError(error: unknown, fallback?: string): void {
    this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error, fallback) });
  }
}

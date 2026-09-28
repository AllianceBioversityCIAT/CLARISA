import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { ConceptScheme, GlobalConceptsApiService, PublicConcept } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { DEFAULT_SCHEME, GC_BASE, ListsByCode, humanError, labelOf, normalizeLists } from '../../global-concepts.utils';
import {
  FacetCode,
  FacetView,
  FilterChip,
  FilterState,
  FilterableConcept,
  SortCode,
  activeChips,
  applyFilters,
  emptyState,
  facetViews,
  filterParams,
  hasAnyFilter,
  parseFilterParams,
  selectedCount,
  sortConcepts
} from '../../global-concepts.filters';

export type ExportFormat = 'json' | 'csv' | 'skos' | 'jsonld';

/** One answer of the list stream: the concepts, or the error that replaced them. */
interface ListResult {
  concepts: FilterableConcept[];
  error: HttpErrorResponse | null;
}

/** Debounce of the URL update and of the server search, in ms. The local match is instant. */
export const SEARCH_DEBOUNCE = 300;

/** Below this length the back is not asked (every word already matches locally). */
const SERVER_SEARCH_MIN = 2;

/**
 * Public list of a concept scheme with faceted search.
 *
 * The whole published set is downloaded once per scheme; filters, counts and
 * sort run in the browser (`global-concepts.filters.ts`). The URL query string
 * is the single source of the state: every change navigates, and the page
 * reads its state back from `queryParamMap`, so a link can be shared and the
 * back button undoes the last filter. Typing updates the results at each key
 * and the URL (replaceUrl, no history spam) after a pause; the same pause
 * asks the back, whose search also knows the hidden search terms, and its
 * hits are added to the local ones.
 */
@Component({
  selector: 'app-gc-concept-list',
  templateUrl: './concept-list.component.html',
  styleUrls: ['./concept-list.component.scss'],
  // The shared Global Concepts kit is declared once, globally (src/styles/_global-concepts.scss).
  host: { class: 'gc-kit' }
})
export class ConceptListComponent implements OnInit, OnDestroy {
  readonly base = GC_BASE;
  readonly exports: { format: ExportFormat; label: string; hint: string }[] = [
    { format: 'json', label: 'JSON', hint: 'Every field, for scripts and APIs' },
    { format: 'csv', label: 'CSV', hint: 'Opens in Excel, same columns as the MELIAF template' },
    { format: 'skos', label: 'SKOS Turtle', hint: 'RDF for vocabulary tools' },
    { format: 'jsonld', label: 'JSON-LD', hint: 'Linked data for the web' }
  ];

  schemeCode = DEFAULT_SCHEME;
  scheme: ConceptScheme | null = null;
  schemes: ConceptScheme[] = [];
  lists: ListsByCode = {};

  /** What is in the search box right now (ahead of the URL while typing). */
  q = '';
  state: FilterState = emptyState();

  all: FilterableConcept[] = [];
  results: FilterableConcept[] = [];
  facets: FacetView[] = [];
  chips: FilterChip[] = [];
  /** Published concepts in view before filters (deprecated counted only when included). */
  total = 0;

  loading = true;
  error: string | null = null;
  schemeError: string | null = null;
  proposeOpen = false;

  private serverHits: ReadonlySet<number> | null = null;
  private serverQ = '';
  /** Last q this page wrote to the URL: its echo must not overwrite newer typing. */
  private lastUrlQ = '';
  private loadedScheme: string | null = null;

  private readonly typed$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();
  private readonly serverSearch$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private _api: GlobalConceptsApiService,
    private _route: ActivatedRoute,
    private _router: Router
  ) {}

  ngOnInit(): void {
    // switchMap drops an answer the reader already replaced; the error is
    // caught inside so one failed call never kills the stream.
    this.reload$
      .pipe(
        switchMap(() => this.fetchAll()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: result => {
          this.loading = false;
          if (!result.error) {
            this.all = result.concepts ?? [];
            this.error = null;
          } else {
            this.all = [];
            this.error = humanError(result.error, { notFound: 'This concept scheme does not exist. Open Global Concepts from the menu.' });
          }
          this.recompute();
        },
        error: () => (this.loading = false)
      });

    // The back's search adds what the browser cannot know (hidden search terms).
    // A failure only drops those extra hits: the local match keeps working.
    this.serverSearch$
      .pipe(
        switchMap(q =>
          q.length < SERVER_SEARCH_MIN
            ? of({ q, hits: null as ReadonlySet<number> | null })
            : this._api.concepts(this.schemeCode, { q }).pipe(
                map(rows => ({ q, hits: new Set((rows ?? []).map(c => c.term_id)) as ReadonlySet<number> | null })),
                catchError(() => of({ q, hits: null as ReadonlySet<number> | null }))
              )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ q, hits }) => {
          this.serverQ = q;
          this.serverHits = hits;
          this.recompute();
        },
        error: () => (this.serverHits = null)
      });

    this.typed$.pipe(debounceTime(SEARCH_DEBOUNCE), takeUntil(this.destroy$)).subscribe({
      next: () => this.navigate({ ...this.state, q: this.q }, true),
      error: () => undefined
    });

    this._api
      .schemes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: schemes => (this.schemes = schemes ?? []),
        // The switcher is optional: without the list the page stays on its scheme.
        error: () => (this.schemes = [])
      });

    this._route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe({
      next: params => this.fromUrl(params),
      error: () => undefined
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** The URL changed (a filter, the back button, a shared link): read the state back. */
  private fromUrl(params: { get(name: string): string | null }): void {
    const scheme = (params.get('scheme') || DEFAULT_SCHEME).toLowerCase();
    const next = parseFilterParams(params);
    // The echo of our own debounced write must not undo what the reader typed since.
    if (next.q !== this.lastUrlQ) this.q = next.q;
    this.lastUrlQ = next.q;
    this.state = next;
    this.schemeCode = scheme;
    if (scheme !== this.loadedScheme) {
      this.loadedScheme = scheme;
      this.serverHits = null;
      this.serverQ = '';
      this.loadScheme();
    }
    const q = next.q.trim();
    if (q !== this.serverQ) this.serverSearch$.next(q);
    this.recompute();
  }

  private loadScheme(): void {
    this.scheme = null;
    this.schemeError = null;
    this.lists = {};
    this._api
      .scheme(this.schemeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: scheme => (this.scheme = scheme),
        error: (error: HttpErrorResponse) =>
          (this.schemeError = humanError(error, { notFound: 'This concept scheme does not exist. Open Global Concepts from the menu.' }))
      });
    this._api
      .lists(this.schemeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: raw => {
          this.lists = normalizeLists(raw);
          this.recompute();
        },
        // Without lists the facets show the raw values and the search keeps working.
        error: () => (this.lists = {})
      });
    this.reload();
  }

  /** Approved + deprecated: the public list answers both when `status` is absent. */
  private fetchAll(): Observable<ListResult> {
    return this._api.concepts(this.schemeCode, {}).pipe(
      map((concepts): ListResult => ({ concepts: concepts as FilterableConcept[], error: null })),
      catchError((error: HttpErrorResponse) => of<ListResult>({ concepts: [], error }))
    );
  }

  reload(): void {
    this.loading = true;
    this.error = null;
    this.reload$.next();
  }

  /** Everything the template draws, computed once per change (not per change detection). */
  recompute(): void {
    const live: FilterState = { ...this.state, q: this.q };
    const hits = this.serverQ && this.serverQ === this.q.trim() ? this.serverHits : null;
    this.facets = facetViews(this.all, live, this.lists, hits);
    this.results = sortConcepts(applyFilters(this.all, live, hits), live.sort);
    this.chips = activeChips(live, this.facets);
    this.total = this.all.filter(c => live.deprecated || c.status !== 'deprecated').length;
  }

  // ------------------------------------------------------------ actions

  private navigate(next: FilterState, replaceUrl = false): void {
    // Applied at once, so the page answers before the router does; the URL
    // echo then finds the same state and changes nothing.
    this.state = next;
    this.lastUrlQ = next.q;
    this.recompute();
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: filterParams(next),
      queryParamsHandling: 'merge',
      replaceUrl
    });
  }

  onQueryInput(value: string): void {
    this.q = value ?? '';
    this.recompute();
    this.typed$.next();
  }

  toggleValue(code: FacetCode, value: string): void {
    const current = this.state.facets[code];
    const values = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    this.navigate({ ...this.state, q: this.q, facets: { ...this.state.facets, [code]: values } });
  }

  clearFacet(code: FacetCode): void {
    this.navigate({ ...this.state, q: this.q, facets: { ...this.state.facets, [code]: [] } });
  }

  setSort(sort: SortCode): void {
    this.navigate({ ...this.state, q: this.q, sort });
  }

  toggleDeprecated(value: boolean): void {
    this.navigate({ ...this.state, q: this.q, deprecated: value });
  }

  removeChip(chip: FilterChip): void {
    if (chip.code === 'q') {
      this.q = '';
      this.navigate({ ...this.state, q: '' });
    } else if (chip.code === 'deprecated') {
      this.toggleDeprecated(false);
    } else {
      this.toggleValue(chip.code, chip.value);
    }
  }

  /** Every filter and the search go; the sort is a preference and stays. */
  clearAll(): void {
    this.q = '';
    this.navigate({ ...emptyState(), sort: this.state.sort });
  }

  get hasFilters(): boolean {
    return hasAnyFilter({ ...this.state, q: this.q });
  }

  get selected(): number {
    return selectedCount(this.state);
  }

  switchScheme(code: string): void {
    // Facet values belong to a scheme: they do not travel to another one.
    this.q = '';
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { ...filterParams({ ...emptyState(), sort: this.state.sort }), scheme: code === DEFAULT_SCHEME ? null : code },
      queryParamsHandling: 'merge'
    });
  }

  label(code: string, value: string | null | undefined): string {
    return labelOf(this.lists, code, value);
  }

  exportUrl(format: ExportFormat): string {
    return this._api.exportUrl(this.schemeCode, format);
  }

  conceptLink(concept: { term_id: number }): (string | number)[] {
    return [this.base, this.schemeCode, concept.term_id];
  }

  summary(concept: PublicConcept): string {
    return concept.short_definition || concept.definition || '';
  }

  trackById(_: number, concept: PublicConcept): number {
    return concept.term_id;
  }

  openPropose(): void {
    this.proposeOpen = true;
    setTimeout(() => document.getElementById('gc-propose')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

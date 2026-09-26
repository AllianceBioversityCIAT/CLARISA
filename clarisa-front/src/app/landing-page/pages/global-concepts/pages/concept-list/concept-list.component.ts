import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import {
  ConceptQuery,
  ConceptScheme,
  GlobalConceptsApiService,
  PublicConcept
} from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { DEFAULT_SCHEME, GC_BASE, ListOption, ListsByCode, humanError, labelOf, normalizeLists } from '../../global-concepts.utils';

/** The three facets of the search, in the order they are drawn. */
export const FACETS: { code: 'meliaf_function' | 'meliaf_phase' | 'term_type'; label: string; all: string }[] = [
  { code: 'meliaf_function', label: 'MELIAF function', all: 'All functions' },
  { code: 'meliaf_phase', label: 'Phase', all: 'All phases' },
  { code: 'term_type', label: 'Term type', all: 'All term types' }
];

export type ExportFormat = 'json' | 'csv' | 'skos' | 'jsonld';

/** One answer of the search stream: the concepts, or the error that replaced them. */
interface ListResult {
  concepts: PublicConcept[];
  error: HttpErrorResponse | null;
}

/** Search debounce, in ms: long enough to skip keystrokes, short enough to feel live. */
export const SEARCH_DEBOUNCE = 300;

@Component({
  selector: 'app-gc-concept-list',
  templateUrl: './concept-list.component.html',
  styleUrls: ['./concept-list.component.scss']
})
export class ConceptListComponent implements OnInit, OnDestroy {
  readonly base = GC_BASE;
  readonly facets = FACETS;
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

  q = '';
  filters: Record<string, string> = { meliaf_function: '', meliaf_phase: '', term_type: '' };
  includeDeprecated = false;

  concepts: PublicConcept[] = [];
  loading = true;
  error: string | null = null;
  schemeError: string | null = null;
  proposeOpen = false;

  private readonly typed$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private _api: GlobalConceptsApiService,
    private _route: ActivatedRoute,
    private _router: Router
  ) {}

  ngOnInit(): void {
    // switchMap drops the answer of a search the reader already replaced; the
    // error is caught inside so one failed call never kills the stream.
    this.reload$
      .pipe(
        switchMap(() => this.fetch()),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        this.loading = false;
        if (!result.error) {
          this.concepts = result.concepts ?? [];
          this.error = null;
        } else {
          this.concepts = [];
          this.error = humanError(result.error, { notFound: 'This concept scheme does not exist. Open Global Concepts from the menu.' });
        }
      });

    this.typed$.pipe(debounceTime(SEARCH_DEBOUNCE), takeUntil(this.destroy$)).subscribe(() => this.search());

    this._api
      .schemes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: schemes => (this.schemes = schemes ?? []),
        // The switcher is optional: without the list the page stays on its scheme.
        error: () => (this.schemes = [])
      });

    this._route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.schemeCode = (params.get('scheme') || DEFAULT_SCHEME).toLowerCase();
      this.loadScheme();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
        next: raw => (this.lists = normalizeLists(raw)),
        // Without lists the facets hide and the search keeps working.
        error: () => (this.lists = {})
      });
    this.search();
  }

  /** The query the back receives; empty values never travel. */
  get query(): ConceptQuery {
    return {
      q: this.q.trim() || undefined,
      meliaf_function: this.filters['meliaf_function'] || undefined,
      meliaf_phase: this.filters['meliaf_phase'] || undefined,
      term_type: this.filters['term_type'] || undefined,
      // The public list answers approved + deprecated when `status` is absent.
      status: this.includeDeprecated ? undefined : 'approved'
    };
  }

  private fetch(): Observable<ListResult> {
    return this._api.concepts(this.schemeCode, this.query).pipe(
      map((concepts): ListResult => ({ concepts, error: null })),
      catchError((error: HttpErrorResponse) => of<ListResult>({ concepts: [], error }))
    );
  }

  search(): void {
    this.loading = true;
    this.error = null;
    this.reload$.next();
  }

  onQueryInput(value: string): void {
    this.q = value;
    this.typed$.next();
  }

  setFilter(code: string, value: string): void {
    this.filters = { ...this.filters, [code]: value };
    this.search();
  }

  toggleDeprecated(value: boolean): void {
    this.includeDeprecated = value;
    this.search();
  }

  get hasFilters(): boolean {
    return !!this.q.trim() || Object.values(this.filters).some(Boolean) || this.includeDeprecated;
  }

  clearFilters(): void {
    this.q = '';
    this.filters = { meliaf_function: '', meliaf_phase: '', term_type: '' };
    this.includeDeprecated = false;
    this.search();
  }

  switchScheme(code: string): void {
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { scheme: code === DEFAULT_SCHEME ? null : code },
      queryParamsHandling: 'merge'
    });
  }

  options(code: string): ListOption[] {
    return this.lists[code] ?? [];
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

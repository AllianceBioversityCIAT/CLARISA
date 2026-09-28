import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AdminConceptDetail, ConceptStatus, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { ConceptFilters, emptyFilters, FilterChip, filterChips, hasIcon, IconFilter, matchesFilters, removeChip } from '../../utils/concept-filters';
import { STATUS_LABELS, statusSeverity } from '../../utils/concept-form';
import { groupLists, ListOption, listLabel } from '../../utils/list-values';
import { GcConceptDialogComponent } from '../gc-concept-dialog/gc-concept-dialog.component';

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
}

export interface SemanticHit {
  term_id: number;
  preferred_label: string;
  status: string;
  score: number;
  /** 0–100, for the bar. */
  percent: number;
  concept: AdminConceptDetail | null;
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
export class GcConceptsPanelComponent implements OnInit, OnChanges {
  @Input() scheme = 'meliaf';
  /** Bumped by the shell after an import. */
  @Input() reloadToken = 0;
  @Input() aiEnabled = false;
  @Input() createRequest: CreateRequest | null = null;
  @ViewChild(GcConceptDialogComponent) dialog?: GcConceptDialogComponent;
  indexing = false;

  loading = false;
  loadError: string | null = null;
  concepts: AdminConceptDetail[] = [];
  rows: ConceptRow[] = [];
  lists: Record<string, ListOption[]> = {};

  filters: ConceptFilters = emptyFilters();
  chips: FilterChip[] = [];
  showMoreFilters = false;
  readonly statusChoices = (Object.keys(STATUS_LABELS) as ConceptStatus[]).map(value => ({ label: STATUS_LABELS[value], value }));
  readonly iconChoices: { label: string; value: IconFilter }[] = [
    { label: 'Any', value: 'any' },
    { label: 'With icon', value: 'with' },
    { label: 'Without', value: 'without' }
  ];

  // --- semantic search ---------------------------------------------------
  semanticText = '';
  semanticBusy = false;
  semanticError: string | null = null;
  semanticHits: SemanticHit[] | null = null;
  semanticQuery = '';

  private handledCreateToken: number | null = null;

  constructor(private readonly _api: GlobalConceptsApiService, private readonly _messageService: MessageService) {}

  ngOnInit(): void {
    this.load();
    this.loadLists();
    this.handleCreateRequest();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = ['scheme', 'reloadToken'].some(key => changes[key] && !changes[key].firstChange);
    if (changed) {
      this.load();
      if (changes['scheme'] && !changes['scheme'].firstChange) {
        this.loadLists();
        this.clearSemantic();
      }
    }
    if (changes['createRequest'] && !changes['createRequest'].firstChange) this.handleCreateRequest();
  }

  /** The dialog is a view child: it exists after the first change detection, so the open waits one tick. */
  private handleCreateRequest(): void {
    const request = this.createRequest;
    if (!request || request.token === this.handledCreateToken) return;
    this.handledCreateToken = request.token;
    setTimeout(() => this.openCreate(request.label));
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this._api.adminConcepts(this.scheme).subscribe({
      next: concepts => {
        this.loading = false;
        this.concepts = (Array.isArray(concepts) ? concepts : []) as AdminConceptDetail[];
        this.applyFilters();
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

  // ------------------------------------------------------------ filters

  applyFilters(): void {
    this.rows = this.concepts.filter(concept => matchesFilters(concept, this.filters)).map(concept => this.toRow(concept));
    this.chips = filterChips(this.filters, this.lists);
  }

  removeFilter(chip: FilterChip): void {
    this.filters = removeChip(this.filters, chip);
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = emptyFilters();
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return this.chips.length > 0;
  }

  /** How many of the secondary filters are on, for the badge of the "More filters" button. */
  get moreFiltersCount(): number {
    return (this.filters.icon !== 'any' ? 1 : 0) + (this.filters.missingDefinition ? 1 : 0) + this.filters.termTypes.length + this.filters.phases.length;
  }

  private toRow(concept: AdminConceptDetail): ConceptRow {
    const functions = (concept.meliaf_function ?? []).map(value => listLabel(this.lists, 'meliaf_function', value));
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
      icon: hasIcon(concept) ? 1 : 0
    };
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

  // ----------------------------------------------------- semantic search

  runSemantic(): void {
    const text = this.semanticText.trim();
    if (!this.aiEnabled || !text || this.semanticBusy) return;
    this.semanticBusy = true;
    this.semanticError = null;
    this._api.semanticSearch(this.scheme, text, 15).subscribe({
      next: hits => {
        this.semanticBusy = false;
        this.semanticQuery = text;
        const list = Array.isArray(hits) ? hits : [];
        const top = Math.max(0, ...list.map(hit => Number(hit.score) || 0));
        this.semanticHits = [...list]
          .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
          .map(hit => ({
            ...hit,
            score: Number(hit.score) || 0,
            percent: top > 1 ? Math.round(((Number(hit.score) || 0) / top) * 100) : Math.round((Number(hit.score) || 0) * 100),
            concept: this.concepts.find(concept => concept.term_id === hit.term_id) ?? null
          }));
      },
      error: error => {
        this.semanticBusy = false;
        this.semanticError = apiErrorMessage(error, 'The semantic search failed');
      }
    });
  }

  clearSemantic(): void {
    this.semanticHits = null;
    this.semanticQuery = '';
    this.semanticError = null;
  }

  // ------------------------------------------------------------- dialog

  openCreate(label = ''): void {
    this.dialog?.openCreate(label);
  }

  openEdit(concept: AdminConceptDetail | null): void {
    if (concept) this.dialog?.openEdit(concept);
  }

  private toastError(error: unknown, fallback?: string): void {
    this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error, fallback) });
  }

  /** Semantic index for duplicate detection (task 3.4); only concepts that changed are paid for. */
  refreshIndex(): void {
    if (this.indexing) return;
    this.indexing = true;
    this._api.refreshEmbeddings(this.scheme).subscribe({
      next: result => {
        this.indexing = false;
        this._messageService.add({
          severity: 'success',
          summary: 'AI index updated',
          detail: `${result.embedded} concept(s) embedded, ${result.unchanged} unchanged.`
        });
      },
      error: error => {
        this.indexing = false;
        this.toastError(error);
      }
    });
  }
}

import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  AiRecommendation,
  ConceptRequest,
  GlobalConceptsApiService,
  RequestState
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { allowedActions, isFinalState, REQUEST_STATES, RequestActionOption, stateLabel, stateSeverity } from '../../utils/request-actions';
import { FIELD_INFO } from '../../utils/field-info';

export type RequestFilter = 'open' | 'all' | RequestState;

export interface RequestRow {
  request: ConceptRequest;
  id: number;
  type: string;
  concept: string;
  requester: string;
  origin: string;
  state: RequestState;
  created_at: string;
}

const OPEN_STATES: RequestState[] = ['submitted', 'in_review', 'changes_requested', 'validation'];

/** `preferred_label` → `Preferred label`. */
export function humanizeField(key: string): string {
  const text = key.replace(/_/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
}

/** A payload value as text a reviewer can read. */
export function payloadValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.map(item => payloadValue(item)).join(', ') : '—';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['label'] === 'string') return record['label'] as string;
    if (typeof record['preferred_label'] === 'string') return record['preferred_label'] as string;
    return JSON.stringify(value);
  }
  return String(value);
}

export function requestConceptLabel(request: ConceptRequest): string {
  const fromPayload = request.payload?.['preferred_label'];
  return request.concept?.preferred_label ?? (typeof fromPayload === 'string' ? fromPayload : '');
}

@Component({
  selector: 'app-gc-requests-panel',
  templateUrl: './gc-requests-panel.component.html',
  styleUrls: ['./gc-requests-panel.component.scss']
})
export class GcRequestsPanelComponent implements OnInit, OnChanges {
  readonly info = FIELD_INFO.request;
  @Input() scheme = 'meliaf-taxonomy';
  @Input() aiEnabled = false;

  loading = false;
  loadError: string | null = null;
  requests: ConceptRequest[] = [];
  rows: RequestRow[] = [];
  filter: RequestFilter = 'open';
  counts: Record<string, number> = {};

  readonly filters: { value: RequestFilter; label: string }[] = [
    { value: 'open', label: 'Open' },
    ...REQUEST_STATES.map(state => ({ value: state as RequestFilter, label: stateLabel(state) })),
    { value: 'all', label: 'All' }
  ];

  // --- detail ----------------------------------------------------------
  dialogVisible = false;
  detail: ConceptRequest | null = null;
  detailLoading = false;
  detailError: string | null = null;

  pendingAction: RequestActionOption | null = null;
  note = '';
  transitioning = false;

  aiLoading = false;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadScheme();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheme'] && !changes['scheme'].firstChange) {
      this.load();
      this.loadScheme();
    }
  }

  /** Whether the scheme has a validation step; null until known (then every action is offered). */
  hasValidation: boolean | null = null;

  private loadScheme(): void {
    this.hasValidation = null;
    this._api.scheme(this.scheme).subscribe({
      next: scheme => (this.hasValidation = typeof scheme?.validator_required === 'boolean' ? scheme.validator_required : null),
      error: () => (this.hasValidation = null)
    });
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this._api.requests(this.scheme).subscribe({
      next: requests => {
        this.loading = false;
        this.requests = Array.isArray(requests) ? requests : [];
        this.countStates();
        this.applyFilter();
      },
      error: error => {
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The requests could not be loaded');
      }
    });
  }

  private countStates(): void {
    const counts: Record<string, number> = { all: this.requests.length, open: 0 };
    for (const state of REQUEST_STATES) counts[state] = 0;
    for (const request of this.requests) {
      counts[request.state] = (counts[request.state] ?? 0) + 1;
      if (OPEN_STATES.includes(request.state)) counts['open']++;
    }
    this.counts = counts;
  }

  setFilter(filter: RequestFilter): void {
    this.filter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    this.rows = this.requests
      .filter(request =>
        this.filter === 'all' ? true : this.filter === 'open' ? OPEN_STATES.includes(request.state) : request.state === this.filter
      )
      .map(request => ({
        request,
        id: request.id,
        type: request.type,
        concept: requestConceptLabel(request),
        requester: request.requester_email ?? '',
        origin: this.originLabel(request),
        state: request.state,
        created_at: request.created_at
      }));
  }

  originLabel(request: ConceptRequest): string {
    switch (request.origin) {
      case 'platform':
        return request.origin_platform ? `Platform · ${request.origin_platform}` : 'Platform';
      case 'clarisa_user':
        return 'CLARISA user';
      case 'form':
        return 'Public form';
      default:
        return request.origin_platform ?? '';
    }
  }

  stateLabel(state: RequestState): string {
    return stateLabel(state);
  }

  stateSeverity(state: RequestState): string {
    return stateSeverity(state);
  }

  typeLabel(type: string): string {
    return humanizeField(type);
  }

  // ------------------------------------------------------------- detail

  open(request: ConceptRequest): void {
    this.detail = request;
    this.dialogVisible = true;
    this.pendingAction = null;
    this.note = '';
    this.fetchDetail(request.id);
  }

  private fetchDetail(id: number): void {
    this.detailLoading = true;
    this.detailError = null;
    this._api.request(id).subscribe({
      // Only the request still open in the dialog may fill it: a late answer for
      // another one would show its data and send its expected_state.
      next: detail => {
        if (this.detail?.id !== id) return;
        this.detailLoading = false;
        this.detail = detail;
      },
      error: error => {
        if (this.detail?.id !== id) return;
        this.detailLoading = false;
        this.detailError = apiErrorMessage(error, 'The request detail could not be loaded');
      }
    });
  }

  get payloadEntries(): { label: string; value: string }[] {
    const payload = this.detail?.payload ?? {};
    return Object.entries(payload).map(([key, value]) => ({ label: humanizeField(key), value: payloadValue(value) }));
  }

  get actions(): RequestActionOption[] {
    return this.detail ? allowedActions(this.detail.state, this.hasValidation) : [];
  }

  get showAiButton(): boolean {
    return this.aiEnabled && !!this.detail && !isFinalState(this.detail.state);
  }

  get recommendation(): AiRecommendation | null {
    return this.detail?.ai_recommendation ?? null;
  }

  chooseAction(option: RequestActionOption): void {
    this.pendingAction = option;
    this.note = '';
  }

  cancelAction(): void {
    this.pendingAction = null;
    this.note = '';
  }

  get noteMissing(): boolean {
    return !!this.pendingAction?.noteRequired && !this.note.trim();
  }

  confirmAction(): void {
    const detail = this.detail;
    const option = this.pendingAction;
    if (!detail || !option || this.noteMissing || this.transitioning) return;

    this.transitioning = true;
    const note = this.note.trim();
    this._api
      .transition(detail.id, {
        action: option.action,
        // The state the admin is looking at. If someone moved it meanwhile the back answers 409.
        expected_state: detail.state,
        ...(note ? { note } : {})
      })
      .subscribe({
        next: updated => {
          this.transitioning = false;
          this.pendingAction = null;
          this.note = '';
          this.detail = updated ?? detail;
          this._messageService.add({
            severity: 'success',
            summary: option.label,
            detail: `Request #${detail.id} is now ${stateLabel(updated?.state ?? detail.state).toLowerCase()}.`
          });
          this.load();
          this.fetchDetail(detail.id);
        },
        error: error => {
          this.transitioning = false;
          this._messageService.add({
            severity: error?.status === 409 ? 'warn' : 'error',
            summary: error?.status === 409 ? 'The request changed meanwhile' : 'Error',
            detail: apiErrorMessage(error)
          });
          if (error?.status === 409) {
            this.pendingAction = null;
            this.load();
            this.fetchDetail(detail.id);
          }
        }
      });
  }

  askAi(): void {
    const detail = this.detail;
    if (!detail || this.aiLoading) return;

    this.aiLoading = true;
    this._api.aiRecommendation(detail.id).subscribe({
      next: recommendation => {
        this.aiLoading = false;
        if (this.detail?.id === detail.id) this.detail = { ...this.detail, ai_recommendation: recommendation };
        const row = this.requests.find(request => request.id === detail.id);
        if (row) row.ai_recommendation = recommendation;
      },
      error: error => {
        this.aiLoading = false;
        this._messageService.add({ severity: 'error', summary: 'AI recommendation', detail: apiErrorMessage(error) });
      }
    });
  }

  verdictLabel(verdict: string): string {
    switch (verdict) {
      case 'approve':
        return 'Suggests approving';
      case 'needs_changes':
        return 'Suggests changes';
      case 'reject':
        return 'Suggests rejecting';
      default:
        return verdict;
    }
  }

  verdictSeverity(verdict: string): string {
    switch (verdict) {
      case 'approve':
        return 'success';
      case 'reject':
        return 'danger';
      default:
        return 'warning';
    }
  }

  severityClass(severity: string): string {
    return severity === 'blocking' ? 'is-blocking' : severity === 'warning' ? 'is-warning' : 'is-info';
  }
}

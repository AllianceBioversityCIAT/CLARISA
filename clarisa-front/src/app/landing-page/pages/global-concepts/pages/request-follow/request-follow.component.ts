import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ConceptRequest, GlobalConceptsApiService, RequestState } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GC_BASE, accessKey, dateLabel, humanError, readSession, writeSession } from '../../global-concepts.utils';

/** What each state means for the person who asked. */
export const STATES: Record<RequestState, { label: string; tone: 'info' | 'warn' | 'ok' | 'error'; help: string }> = {
  submitted: { label: 'Submitted', tone: 'info', help: 'Your request is waiting for a steward to pick it up.' },
  in_review: { label: 'In review', tone: 'info', help: 'A steward is reviewing your request.' },
  changes_requested: {
    label: 'Changes requested',
    tone: 'warn',
    help: 'The stewards need something from you. Read their note below, update your request and send it back.'
  },
  validation: { label: 'In validation', tone: 'info', help: 'The change is being validated before it is published.' },
  approved: { label: 'Approved', tone: 'ok', help: 'Your request was approved and the concept is updated.' },
  rejected: { label: 'Not approved', tone: 'error', help: 'The stewards decided not to apply this request. Their note explains why.' }
};

const STEPS: RequestState[] = ['submitted', 'in_review', 'validation'];

const TYPES: Record<string, string> = {
  new: 'New concept',
  edit: 'Change to a concept',
  merge: 'Merge',
  deprecate: 'Deprecation',
  promote: 'Promotion'
};

@Component({
  selector: 'app-gc-request-follow',
  templateUrl: './request-follow.component.html',
  styleUrls: ['./request-follow.component.scss'],
  // The shared Global Concepts kit is declared once, globally (src/styles/_global-concepts.scss).
  host: { class: 'gc-kit' }
})
export class RequestFollowComponent implements OnInit {
  readonly base = GC_BASE;
  readonly steps = STEPS;

  id = 0;
  request: ConceptRequest | null = null;
  loading = true;
  error: string | null = null;

  /** Kept in memory too, so Reload and the answer work when sessionStorage is blocked. */
  private accessToken: string | null = null;

  /** The answer to a "changes requested": the fields the public form sends. */
  readonly answerFields: { key: string; label: string; long?: boolean }[] = [
    { key: 'preferred_label', label: 'Preferred label' },
    { key: 'definition', label: 'Definition', long: true },
    { key: 'source_citation', label: 'Source' },
    { key: 'source_url', label: 'Source URL' }
  ];
  answer: Record<string, string> = {};
  answerRationale = '';
  sending = false;
  answerError: string | null = null;

  constructor(
    private _api: GlobalConceptsApiService,
    private _route: ActivatedRoute,
    private _router: Router
  ) {}

  ngOnInit(): void {
    this.id = Number(this._route.snapshot.paramMap.get('id'));
    const fromUrl = (this._route.snapshot.queryParamMap.get('token') ?? '').trim();
    if (fromUrl && this.id > 0) {
      writeSession(accessKey(this.id), fromUrl);
      // The token leaves the address bar: it would otherwise stay in the
      // history and travel as a referrer. The API gets it in a header.
      this._router.navigate([], { relativeTo: this._route, queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
    this.accessToken = fromUrl || readSession(accessKey(this.id));
    this.load(this.accessToken);
  }

  private token(): string | null {
    return this.accessToken ?? readSession(accessKey(this.id));
  }

  reload(): void {
    this.load(this.token());
  }

  private load(token: string | null): void {
    if (!Number.isInteger(this.id) || this.id < 1) {
      this.loading = false;
      this.error = 'This link does not point to a request. Open the follow link from your email.';
      return;
    }
    if (!token) {
      this.loading = false;
      this.error = 'To see this request, open the follow link we emailed you. It carries the key that shows the request to you only.';
      return;
    }
    this.loading = true;
    this.error = null;
    this._api.followRequest(this.id, token).subscribe({
      next: request => {
        this.request = request;
        this.loading = false;
        this.resetAnswer();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.error = humanError(error, {
          notFound: 'We could not find this request with this link. Open the most recent follow link we emailed you.'
        });
      }
    });
  }

  get state() {
    return this.request ? (STATES[this.request.state] ?? { label: this.request.state, tone: 'info' as const, help: '' }) : null;
  }

  /** Index of the current step in the progress rail; final states fill it. */
  get stepIndex(): number {
    const state = this.request?.state;
    if (!state) return -1;
    if (state === 'approved' || state === 'rejected') return STEPS.length;
    if (state === 'changes_requested') return 1;
    return STEPS.indexOf(state);
  }

  stepLabel(step: RequestState): string {
    return STATES[step].label;
  }

  typeLabel(type: string): string {
    return TYPES[type] ?? type;
  }

  /** The concept the request is about, from its payload; plain text only. */
  get subject(): string | null {
    const label = this.request?.payload?.['preferred_label'];
    return typeof label === 'string' && label.trim() ? label : (this.request?.concept?.preferred_label ?? null);
  }

  get canAnswer(): boolean {
    return this.request?.state === 'changes_requested' && (this.request.type === 'new' || this.request.type === 'edit');
  }

  private resetAnswer(): void {
    const payload = this.request?.payload ?? {};
    this.answer = {};
    for (const f of this.answerFields) {
      const v = payload[f.key];
      this.answer[f.key] = typeof v === 'string' ? v : '';
    }
    this.answerRationale = this.request?.rationale ?? '';
    this.answerError = null;
  }

  /** Sends the updated request back to the stewards (it returns to review). */
  sendAnswer(): void {
    const token = this.token();
    if (!this.request || !token || this.sending) return;
    if (this.request.type === 'new' && !(this.answer['preferred_label'] ?? '').trim()) {
      this.answerError = 'A new concept needs its preferred label.';
      return;
    }
    const payload: Record<string, unknown> = { ...(this.request.payload ?? {}) };
    for (const f of this.answerFields) {
      const v = (this.answer[f.key] ?? '').trim();
      if (v) payload[f.key] = v;
      else delete payload[f.key];
    }
    this.sending = true;
    this.answerError = null;
    this._api.resubmitRequest(this.id, token, { payload, rationale: this.answerRationale.trim() || undefined }).subscribe({
      next: request => {
        this.sending = false;
        this.request = request;
        this.resetAnswer();
      },
      error: (error: HttpErrorResponse) => {
        this.sending = false;
        this.answerError = humanError(error, { notFound: 'This request could not be found with your link.' });
      }
    });
  }

  date(value: string | null | undefined): string {
    return dateLabel(value);
  }
}

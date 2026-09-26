import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Client of the Global Concepts module (`api/global-concepts`), shared by the
 * admin section and the public page. Shapes mirror the back's presenters
 * (clarisa-back/src/api/global-concepts); field names follow the MELIAF data
 * schema template.
 */

export type ConceptStatus = 'draft' | 'in_review' | 'approved' | 'deprecated';
export type LabelKind = 'pref' | 'alt' | 'hidden' | 'acronym';

export interface ConceptRef {
  term_id: number;
  uri: string;
  preferred_label: string;
}

export interface ConceptLabel {
  label: string;
  language: string;
  kind: LabelKind;
  discouraged: boolean;
}

export interface ConceptMapping {
  target_scheme: string;
  target_uri: string;
  target_label: string | null;
  match_type: string;
  justification: string;
  confidence: number | null;
}

export interface PublicConcept {
  scheme: string;
  term_id: number;
  term_uri: string;
  preferred_label: string;
  language: string;
  preferred_labels: { label: string; language: string }[];
  alternative_labels: ConceptLabel[];
  definition: string | null;
  short_definition: string | null;
  scope_note: string | null;
  example_of_use: string | null;
  term_type: string | null;
  meliaf_function: string[];
  meliaf_phase_primary: string | null;
  meliaf_phase_also: string[];
  broader_terms: ConceptRef[];
  narrower_terms: ConceptRef[];
  related_terms: ConceptRef[];
  source_citation: string | null;
  source_url: string | null;
  derivation: string | null;
  origin: string | null;
  ai_generated_fields: string[];
  status: ConceptStatus;
  version: string;
  date_created: string | null;
  date_modified: string | null;
  validated_by: string[];
  date_validated: string | null;
  steward: string | null;
  replaced_by: ConceptRef | null;
  rights_note: string | null;
  mappings: ConceptMapping[];
}

export interface AdminConcept extends PublicConcept {
  notes: string | null;
  created_by_email: string | null;
  updated_by_email: string | null;
}

export interface ConceptScheme {
  code: string;
  uri: string;
  title: string;
  description: string | null;
  default_language: string;
  license: string | null;
  publisher: string | null;
  governance_description: string | null;
  owner_platform: string | null;
}

export interface ListValue {
  list_code: string;
  value: string;
  label: string;
  sort: number;
}

export interface ConceptHistoryEntry {
  action: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  changed_at: string;
  release?: string | null;
}

export interface ConceptRelease {
  version: string;
  release_uri: string | null;
  previous_version: string | null;
  released_at: string;
  notes: string | null;
  license: string | null;
}

export type RequestState = 'submitted' | 'in_review' | 'changes_requested' | 'validation' | 'approved' | 'rejected';
export type RequestType = 'new' | 'edit' | 'merge' | 'deprecate' | 'promote';
export type RequestAction = 'start_review' | 'request_changes' | 'send_to_validation' | 'approve' | 'reject';

export interface AiRecommendation {
  advisory: true;
  verdict: 'approve' | 'needs_changes' | 'reject';
  summary: string;
  reasons: { kind: string; severity: 'info' | 'warning' | 'blocking' | string; message: string }[];
  suggested_changes: string;
  checks: { check: string; ok: boolean; detail: string }[];
  similar: { term_id: number; preferred_label: string }[];
  generated_at: string;
}

export interface ConceptRequest {
  id: number;
  type: RequestType;
  state: RequestState;
  payload: Record<string, unknown>;
  rationale: string | null;
  decision_note: string | null;
  no_objection_until: string | null;
  created_at: string;
  updated_at: string;
  concept_id?: number | null;
  concept?: { term_id: number; preferred_label: string } | null;
  target_concept?: { term_id: number; preferred_label: string } | null;
  base_version?: string | null;
  requester_email?: string;
  origin?: 'form' | 'platform' | 'clarisa_user';
  origin_platform?: string | null;
  ai_recommendation?: AiRecommendation | null;
  decided_by_email?: string | null;
  events?: { from_state: RequestState | null; to_state: RequestState; actor_email: string | null; note: string | null; at: string }[];
}

export interface ImportRowResult {
  row: number;
  action: 'create' | 'update' | 'skip' | 'invalid';
  term_id: number | null;
  preferred_label: string;
  changes: string[];
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  applied: boolean;
  summary: { total: number; to_create: number; to_update: number; unchanged: number; invalid: number; with_warnings: number };
  rows: ImportRowResult[];
}

export interface ColumnMatch {
  column: number;
  header: string;
  field: string | null;
  confidence: number;
  source: 'exact' | 'ai' | 'none';
}

export interface ImportField {
  field: string;
  hint: string;
}

export interface AiStatus {
  enabled: boolean;
  model: string;
  month: string;
  spent_usd: number;
  cap_usd: number;
  calls: number;
}

export interface ConceptSuggestion {
  term_id: number;
  term_uri: string;
  preferred_label: string;
  short_definition: string | null;
  definition: string | null;
  status: string;
  matched: { label: string; kind: string; count: number }[];
  replaced_by: ConceptRef | null;
}

export interface ConceptQuery {
  q?: string;
  status?: string;
  meliaf_function?: string;
  meliaf_phase?: string;
  term_type?: string;
  version?: string;
}

const params = (query: object = {}) => {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
};

@Injectable({ providedIn: 'root' })
export class GlobalConceptsApiService {
  private readonly base = `${environment.apiUrl}api/global-concepts`;

  constructor(private _http: HttpClient) {}

  // ------------------------------------------------------------------ public

  schemes(): Observable<ConceptScheme[]> {
    return this._http.get<ConceptScheme[]>(`${this.base}/schemes`);
  }

  scheme(code: string): Observable<ConceptScheme> {
    return this._http.get<ConceptScheme>(`${this.base}/${encodeURIComponent(code)}`);
  }

  /** The back answers `{ list_code: [{ value, label }] }` in sort order; flattened here for the UI. */
  lists(scheme?: string): Observable<ListValue[]> {
    return this._http
      .get<Record<string, { value: string; label: string }[]>>(`${this.base}/lists`, { params: params({ scheme }) })
      .pipe(
        map(byList =>
          Object.entries(byList ?? {}).flatMap(([list_code, values]) =>
            (values ?? []).map((v, sort) => ({ list_code, value: v.value, label: v.label, sort }))
          )
        )
      );
  }

  concepts(scheme: string, query: ConceptQuery = {}): Observable<PublicConcept[]> {
    return this._http.get<PublicConcept[]>(`${this.base}/${encodeURIComponent(scheme)}/concepts`, { params: params(query) });
  }

  concept(scheme: string, termId: number): Observable<PublicConcept> {
    return this._http.get<PublicConcept>(`${this.base}/${encodeURIComponent(scheme)}/concepts/${termId}`);
  }

  history(scheme: string, termId: number): Observable<ConceptHistoryEntry[]> {
    return this._http.get<ConceptHistoryEntry[]>(`${this.base}/${encodeURIComponent(scheme)}/concepts/${termId}/history`);
  }

  releases(scheme: string): Observable<ConceptRelease[]> {
    return this._http.get<ConceptRelease[]>(`${this.base}/${encodeURIComponent(scheme)}/releases`);
  }

  exportUrl(scheme: string, format: 'json' | 'csv' | 'skos' | 'jsonld'): string {
    return `${this.base}/${encodeURIComponent(scheme)}/export?format=${format}`;
  }

  /** The text travels in the body, never in the URL (request logs keep URLs). */
  suggest(scheme: string, text: string): Observable<{ scheme: string; suggestions: ConceptSuggestion[]; retained: false }> {
    return this._http.post<{ scheme: string; suggestions: ConceptSuggestion[]; retained: false }>(
      `${this.base}/${encodeURIComponent(scheme)}/suggest`,
      { text }
    );
  }

  /** Public form, step 1: the back emails a one-time confirmation link. */
  startRequest(scheme: string, body: Record<string, unknown>): Observable<{ status: string; expires_in_hours: number }> {
    return this._http.post<{ status: string; expires_in_hours: number }>(`${this.base}/${encodeURIComponent(scheme)}/requests/start`, body);
  }

  verifyRequest(token: string): Observable<ConceptRequest & { access_token: string }> {
    return this._http.post<ConceptRequest & { access_token: string }>(`${this.base}/requests/verify`, { token });
  }

  followRequest(id: number, accessToken: string): Observable<ConceptRequest> {
    return this._http.get<ConceptRequest>(`${this.base}/requests/${id}`, { headers: { 'x-gc-access-token': accessToken } });
  }

  /** Answer a "changes requested": the payload replaces the previous one. */
  resubmitRequest(id: number, accessToken: string, body: { payload?: Record<string, unknown>; rationale?: string }): Observable<ConceptRequest> {
    return this._http.post<ConceptRequest>(`${this.base}/requests/${id}/resubmit`, body, { headers: { 'x-gc-access-token': accessToken } });
  }

  // ------------------------------------------------------------------- admin

  private get admin() {
    return `${this.base}/admin`;
  }

  adminConcepts(scheme: string, status?: string): Observable<AdminConcept[]> {
    return this._http.get<AdminConcept[]>(`${this.admin}/${encodeURIComponent(scheme)}/concepts`, { params: params({ status }) });
  }

  createConcept(scheme: string, body: Record<string, unknown>): Observable<AdminConcept> {
    return this._http.post<AdminConcept>(`${this.admin}/${encodeURIComponent(scheme)}/concepts`, body);
  }

  updateConcept(scheme: string, termId: number, body: Record<string, unknown>): Observable<AdminConcept> {
    return this._http.patch<AdminConcept>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}`, body);
  }

  setStatus(
    scheme: string,
    termId: number,
    body: { status: ConceptStatus; replaced_by_term_id?: number; reason?: string }
  ): Observable<AdminConcept> {
    return this._http.patch<AdminConcept>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/status`, body);
  }

  setLabels(
    scheme: string,
    termId: number,
    labels: { label: string; language?: string; kind: LabelKind; status?: string }[]
  ): Observable<AdminConcept> {
    return this._http.put<AdminConcept>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/labels`, { labels });
  }

  quality(scheme: string): Observable<unknown> {
    return this._http.get(`${this.admin}/${encodeURIComponent(scheme)}/quality`);
  }

  publishRelease(scheme: string, body: { version: string; notes?: string }): Observable<ConceptRelease> {
    return this._http.post<ConceptRelease>(`${this.admin}/${encodeURIComponent(scheme)}/releases`, body);
  }

  requests(scheme: string, state?: RequestState): Observable<ConceptRequest[]> {
    return this._http.get<ConceptRequest[]>(`${this.admin}/${encodeURIComponent(scheme)}/requests`, { params: params({ state }) });
  }

  request(id: number): Observable<ConceptRequest> {
    return this._http.get<ConceptRequest>(`${this.admin}/requests/${id}`);
  }

  transition(id: number, body: { action: RequestAction; expected_state: RequestState; note?: string }): Observable<ConceptRequest> {
    return this._http.post<ConceptRequest>(`${this.admin}/requests/${id}/transition`, body);
  }

  aiStatus(): Observable<AiStatus> {
    return this._http.get<AiStatus>(`${this.admin}/ai/status`);
  }

  aiRecommendation(id: number): Observable<AiRecommendation> {
    return this._http.post<AiRecommendation>(`${this.admin}/requests/${id}/ai-recommendation`, {});
  }

  aiMapColumns(headers: string[], rows: string[][]): Observable<{ columns: ColumnMatch[]; fields: ImportField[] }> {
    return this._http.post<{ columns: ColumnMatch[]; fields: ImportField[] }>(`${this.admin}/ai/map-columns`, {
      headers,
      rows: rows.slice(0, 5)
    });
  }

  aiNormalize(scheme: string, list: string, values: string[]) {
    return this._http.post<{ list: string; allowed: string[]; values: { input: string; value: string | null; source: string }[] }>(
      `${this.admin}/${encodeURIComponent(scheme)}/ai/normalize`,
      { list, values }
    );
  }

  importPreview(scheme: string, rows: Record<string, unknown>[]): Observable<ImportResult> {
    return this._http.post<ImportResult>(`${this.admin}/${encodeURIComponent(scheme)}/import/preview`, { rows });
  }

  importRows(scheme: string, rows: Record<string, unknown>[], skipInvalid = false): Observable<ImportResult> {
    return this._http.post<ImportResult>(`${this.admin}/${encodeURIComponent(scheme)}/import`, { rows, skip_invalid: skipInvalid });
  }
}

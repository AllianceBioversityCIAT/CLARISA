import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Client of the Global Concepts module (`api/concepts`), shared by the
 * admin section and the public page. Shapes mirror the back's presenters
 * (clarisa-back/src/api/global-concepts); field names follow the Concepts data
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
  functions: string[];
  phase_primary: string | null;
  phase_also: string[];
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
  /** Only on a `q` search: how the concept matched and which characters to mark. */
  match?: SearchMatch;
}

/**
 * How a search hit matched (the back's `utils/concept-search`): `exact` = the
 * words together and in order, `words` = every word somewhere, `similar` =
 * close words (typos, missing letters). `ranges` are `[start, end)` offsets.
 */
export interface SearchMatch {
  tier: 'exact' | 'words' | 'similar';
  score: number;
  highlights: { field: 'preferred_label' | 'alternative_labels' | 'short_definition' | 'definition'; text?: string; ranges: [number, number][] }[];
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
  /** Requests go through validation before approval; absent from an older back. */
  validator_required?: boolean;
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

/** The four download formats of a scheme, in menu order. */
export type ConceptExportFormat = 'json' | 'csv' | 'skos' | 'jsonld';

export const CONCEPT_EXPORT_FORMATS: ReadonlyArray<{ format: ConceptExportFormat; label: string; hint: string }> = [
  { format: 'json', label: 'JSON', hint: 'Every field, for scripts and APIs' },
  { format: 'csv', label: 'CSV', hint: 'Opens in Excel, same columns as the concepts template' },
  { format: 'skos', label: 'SKOS Turtle', hint: 'RDF for vocabulary tools' },
  { format: 'jsonld', label: 'JSON-LD', hint: 'Linked data for the web' }
];

/** "Current" plus every published release, newest first, as select options. */
export function releaseOptions(releases: ConceptRelease[] | null | undefined): { label: string; value: string | null }[] {
  const published = [...(releases ?? [])]
    .filter(r => !!r?.version)
    .sort((a, b) => String(b.released_at ?? '').localeCompare(String(a.released_at ?? '')))
    .map(r => ({ label: r.released_at ? `${r.version} · ${String(r.released_at).slice(0, 10)}` : r.version, value: r.version }));
  return [{ label: 'Current (latest)', value: null }, ...published];
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

/** One target of the import wizard; custom fields also carry their `label` (the header an exact match compares with). */
export interface ImportFieldInfo {
  field: string;
  hint: string;
  custom: boolean;
  label?: string;
  type?: string;
  list_code?: string | null;
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
  functions?: string;
  phase?: string;
  term_type?: string;
  version?: string;
  /** `0` = not counted in the usage analytics (search-as-you-type). */
  track?: 0;
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
  private readonly base = `${environment.apiUrl}api/concepts`;

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

  /** `version` empty or null = the current state; otherwise that published release. */
  exportUrl(scheme: string, format: ConceptExportFormat, version?: string | null): string {
    const pinned = version ? `&version=${encodeURIComponent(version)}` : '';
    return `${this.base}/${encodeURIComponent(scheme)}/export?format=${format}${pinned}`;
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

  refreshEmbeddings(scheme: string): Observable<{ embedded: number; unchanged: number }> {
    return this._http.post<{ embedded: number; unchanged: number }>(`${this.admin}/${encodeURIComponent(scheme)}/ai/embeddings/refresh`, {});
  }

  semanticSearch(
    scheme: string,
    text: string,
    limit = 10
  ): Observable<{ term_id: number; preferred_label: string; status: string; score: number }[]> {
    return this._http.post<{ term_id: number; preferred_label: string; status: string; score: number }[]>(
      `${this.admin}/${encodeURIComponent(scheme)}/ai/semantic-search`,
      { text, limit }
    );
  }

  // ------------------------------------------- admin · concept editor (contract v2)

  /** One concept as the admin sees it, with `mappings_all` (ids) and its history rows. */
  adminConcept(scheme: string, termId: number): Observable<AdminConceptDetail> {
    return this._http.get<AdminConceptDetail>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}`);
  }

  addRelation(scheme: string, termId: number, body: { kind: RelationKind; target_term_id: number }): Observable<AdminConceptDetail> {
    return this._http.post<AdminConceptDetail>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/relations`, body);
  }

  removeRelation(scheme: string, termId: number, body: { kind: RelationKind; target_term_id: number }): Observable<AdminConceptDetail> {
    return this._http.post<AdminConceptDetail>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/relations/remove`, body);
  }

  addMapping(scheme: string, termId: number, body: MappingInput): Observable<AdminConceptDetail> {
    return this._http.post<AdminConceptDetail>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/mappings`, body);
  }

  removeMapping(scheme: string, termId: number, mappingId: number): Observable<AdminConceptDetail> {
    return this._http.delete<AdminConceptDetail>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/mappings/${mappingId}`);
  }

  icons(scheme: string, termId: number): Observable<AdminIcon[]> {
    return this._http.get<AdminIcon[]>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/icons`);
  }

  createIcon(scheme: string, termId: number, body: IconInput): Observable<AdminIcon> {
    return this._http.post<AdminIcon>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/icons`, body);
  }

  /**
   * Nested under the concept (`concepts/:termId/icons/:id`) so a concepts-only
   * member (`CONCEPTS_CE`) reaches it; the back answers 404 if the icon belongs
   * to another concept. Full admins pass too (`/admin` is a substring).
   */
  updateIcon(scheme: string, termId: number, id: number, body: Partial<IconInput>): Observable<AdminIcon> {
    return this._http.patch<AdminIcon>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/icons/${id}`, body);
  }

  deleteIcon(scheme: string, termId: number, id: number): Observable<{ deleted: number }> {
    return this._http.delete<{ deleted: number }>(`${this.admin}/${encodeURIComponent(scheme)}/concepts/${termId}/icons/${id}`);
  }

  /**
   * Same payload as `fields()`, read-only, under the concept path: what the
   * concept editor reads, so a concepts-only member can load it without the
   * Setup permission. Setup keeps `fields()`.
   */
  conceptFields(scheme: string): Observable<CustomField[]> {
    return this._http.get<CustomField[]>(`${this.admin}/${encodeURIComponent(scheme)}/concepts-meta/fields`);
  }

  /** Every custom field definition of the scheme, active and inactive (Setup). */
  fields(scheme: string): Observable<CustomField[]> {
    return this._http.get<CustomField[]>(`${this.admin}/${encodeURIComponent(scheme)}/fields`);
  }

  createField(scheme: string, body: CustomFieldInput): Observable<CustomField> {
    return this._http.post<CustomField>(`${this.admin}/${encodeURIComponent(scheme)}/fields`, body);
  }

  /** `code` and `type` are immutable once created; the back rejects them here. */
  updateField(scheme: string, id: number, body: CustomFieldPatch): Observable<CustomField> {
    return this._http.patch<CustomField>(`${this.admin}/${encodeURIComponent(scheme)}/fields/${id}`, body);
  }

  /** Every value the scheme sees, inactive included, with the ids the PATCH needs. */
  adminLists(scheme: string): Observable<AdminListValue[]> {
    return this._http.get<AdminListValue[]>(`${this.admin}/${encodeURIComponent(scheme)}/lists`);
  }

  addListValue(
    scheme: string,
    body: { list_code: string; label: string; value?: string; sort?: number; shared?: boolean; new_list?: boolean }
  ): Observable<AdminListValue> {
    return this._http.post<AdminListValue>(`${this.admin}/${encodeURIComponent(scheme)}/lists`, body);
  }

  updateListValue(scheme: string, id: number, body: { label?: string; sort?: number; is_active?: boolean }): Observable<AdminListValue> {
    return this._http.patch<AdminListValue>(`${this.admin}/${encodeURIComponent(scheme)}/lists/${id}`, body);
  }

  collections(scheme: string): Observable<ConceptCollection[]> {
    return this._http.get<ConceptCollection[]>(`${this.admin}/${encodeURIComponent(scheme)}/collections`);
  }

  createCollection(scheme: string, body: { code: string; label: string; ordered?: boolean }): Observable<ConceptCollection> {
    return this._http.post<ConceptCollection>(`${this.admin}/${encodeURIComponent(scheme)}/collections`, body);
  }

  updateCollection(scheme: string, code: string, body: { label?: string; ordered?: boolean }): Observable<ConceptCollection> {
    return this._http.patch<ConceptCollection>(`${this.admin}/${encodeURIComponent(scheme)}/collections/${encodeURIComponent(code)}`, body);
  }

  setCollectionMembers(scheme: string, code: string, termIds: number[]): Observable<ConceptCollection> {
    return this._http.put<ConceptCollection>(`${this.admin}/${encodeURIComponent(scheme)}/collections/${encodeURIComponent(code)}/members`, {
      term_ids: termIds
    });
  }

  deleteCollection(scheme: string, code: string): Observable<{ deleted: string }> {
    return this._http.delete<{ deleted: string }>(`${this.admin}/${encodeURIComponent(scheme)}/collections/${encodeURIComponent(code)}`);
  }

  usage(scheme: string, days: number): Observable<UsageSummary> {
    return this._http.get<UsageSummary>(`${this.admin}/${encodeURIComponent(scheme)}/usage`, { params: params({ days }) });
  }

  /** Calls per connected system (API key → MIS) to the whole Concepts API, plus the anonymous reads. */
  usageByPlatform(scheme: string, days: number): Observable<PlatformUsage> {
    return this._http.get<PlatformUsage>(`${this.admin}/${encodeURIComponent(scheme)}/usage/platforms`, { params: params({ days }) });
  }

  /** Advisory: nothing is saved until the editor accepts the text and saves the concept. */
  aiDraft(
    scheme: string,
    body: { preferred_label: string; definition: string; fields: AiDraftField[] }
  ): Observable<Partial<Record<AiDraftField, string>>> {
    return this._http.post<Partial<Record<AiDraftField, string>>>(`${this.admin}/${encodeURIComponent(scheme)}/ai/draft`, body);
  }

  /** Whether the concept assistant can answer for this scheme; a user without AI gets `enabled: false` (or a 403). */
  conceptsAssistStatus(scheme: string): Observable<ConceptsAssistStatus> {
    return this._http.get<ConceptsAssistStatus>(`${this.admin}/${encodeURIComponent(scheme)}/concepts-assist/status`);
  }

  /** One assistant turn. Advisory: it returns steps the dialog plays on the form; nothing is saved by the back. */
  conceptsAssistChat(scheme: string, body: ConceptsAssistRequest): Observable<ConceptsAssistReply> {
    return this._http.post<ConceptsAssistReply>(`${this.admin}/${encodeURIComponent(scheme)}/concepts-assist/chat`, body);
  }

  // ------------------------------------------------- public (contract v2, developers page)

  /** Root of the module's routes, for documentation and live examples. */
  get publicBase(): string {
    return this.base;
  }

  /** Active public custom fields of a scheme (`GET :scheme/fields`). */
  publicFields(scheme: string): Observable<PublicFieldDef[]> {
    return this._http.get<PublicFieldDef[]>(`${this.base}/${encodeURIComponent(scheme)}/fields`);
  }

  /** URL of the stateless Streamable HTTP MCP endpoint. */
  get mcpUrl(): string {
    return `${this.base}/mcp`;
  }

  /** One JSON-RPC message to the MCP endpoint (answered with plain JSON). */
  mcpCall(body: McpRequest): Observable<unknown> {
    return this._http.post<unknown>(this.mcpUrl, body, { headers: { Accept: 'application/json, text/event-stream' } });
  }

  /** Import columns: built-in schema fields plus `x:<code>` for each active custom field. */
  importFields(scheme: string): Observable<ImportFieldInfo[]> {
    return this._http.get<ImportFieldInfo[]>(`${this.admin}/${encodeURIComponent(scheme)}/import-fields`);
  }
}

// ------------------------------------------------ admin types (contract v2)

export type RelationKind = 'broader' | 'related';
export type MatchType = 'exact' | 'close' | 'broad' | 'narrow' | 'related';

export interface AdminMapping extends ConceptMapping {
  id: number;
}

export interface MappingInput {
  target_scheme: string;
  target_uri: string;
  target_label?: string;
  match_type?: MatchType;
  /** How the match was made (SSSOM). A form only sends these two; `ai_suggested` is written by the module. */
  justification?: 'manual' | 'lexical';
  /** 0..1. */
  confidence?: number;
}

/** The admin shape as it arrives: the public one plus ids and the raw `extra`. */
export interface AdminConceptDetail extends AdminConcept {
  mappings_all?: AdminMapping[];
  extra?: Record<string, unknown>;
  icons?: { icon_code: string | null; status: string; format: string | null; alt_text: string | null; url: string | null }[];
  history?: unknown[];
}

export interface IconInput {
  icon_code?: string | null;
  icon_status: string;
  file_format?: string | null;
  file_name?: string | null;
  designer?: string | null;
  designer_country?: string | null;
  year_created?: number | null;
  rights_and_licence?: string | null;
  alt_text?: string | null;
  file_link_primary?: string | null;
  file_link_backup?: string | null;
  date_added?: string | null;
}

export interface AdminIcon extends IconInput {
  id: number;
}

export type CustomFieldType = 'text' | 'long_text' | 'multi_text' | 'list' | 'multi_list' | 'term_link' | 'url' | 'date' | 'number';

export interface CustomField {
  id: number;
  code: string;
  label: string;
  type: CustomFieldType;
  list_code: string | null;
  required: boolean;
  is_public: boolean;
  sort: number;
  is_active: boolean;
  help: string | null;
  created_at?: string;
}

export interface CustomFieldInput {
  code: string;
  label: string;
  type: CustomFieldType;
  list_code?: string;
  required?: boolean;
  is_public?: boolean;
  sort?: number;
  help?: string;
}

export interface CustomFieldPatch {
  label?: string;
  help?: string;
  required?: boolean;
  is_public?: boolean;
  sort?: number;
  is_active?: boolean;
}

export interface AdminListValue {
  id: number;
  list_code: string;
  value: string;
  label: string;
  sort: number;
  is_active: boolean;
  shared: boolean;
}

export interface ConceptCollection {
  code: string;
  label: string;
  ordered: boolean;
  members: { term_id: number; preferred_label: string; status: string }[];
}

export interface UsageSummary {
  days: number;
  totals: { search: number; zero_search: number; view: number; export: number; mcp: number; suggest: number };
  /** Every counted kind per day; the extra kinds are optional for an older back. */
  by_day: { day: string; search: number; view: number; zero_search?: number; export?: number; mcp?: number; suggest?: number }[];
  top_searches: { item: string; count: number }[];
  zero_result_searches: { item: string; count: number }[];
  top_viewed: { term_id: number; preferred_label: string; count: number }[];
}

/** `GET admin/{scheme}/usage/platforms` (platform-usage.service.ts). */
export interface PlatformUsage {
  scope: 'all-schemes';
  from: string;
  to: string;
  endpoint_prefixes: string[];
  systems: PlatformUsageSystem[];
  platform_calls: number;
  /** The module's own counters: `total = keyed + anonymous`. */
  counted_reads: { total: number; keyed: number; anonymous: number };
}

export interface PlatformUsageSystem {
  mis_id: number | null;
  acronym: string;
  name: string;
  environment: string | null;
  calls: number;
  errors: number;
  avg_response_time_ms: number | null;
  api_keys: number;
  last_used_at: string | null;
  /** Since 2026-09-30 a key with no MIS is its own row: `kind: 'key'`, `api_key_id` set. */
  kind?: 'mis' | 'key';
  api_key_id?: number | null;
  /** `mis:<id>` or `key:<id>` */
  system_key?: string;
}

export type AiDraftField = 'short_definition' | 'scope_note' | 'example_of_use';

// ------------------------------------------------ concept assistant (assistant-contract.md)

export interface ConceptsAssistStatus {
  enabled: boolean;
  reason?: string;
  remainingUsd: number;
}

export interface ConceptsAssistMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** A change the person made by hand, in order. Custom fields are `x:<code>`. */
export interface ConceptsAssistEdit {
  seq: number;
  field: string;
  tab: string;
  before: unknown;
  after: unknown;
  at: string;
}

export interface ConceptsAssistRequest {
  termId?: number;
  draft: Record<string, unknown>;
  messages: ConceptsAssistMessage[];
  edits: ConceptsAssistEdit[];
}

export interface ConceptsAssistStep {
  field: string;
  tab: 'details' | 'fields';
  value: unknown;
  reason: string;
}

export interface ConceptsAssistReply {
  reply: string;
  steps: ConceptsAssistStep[];
  costUsd: number;
}

// ----------------------------------------------------------- public shape v2 (contract-v2.md)

/** An icon as published: `url` is the primary link only when it is http(s). */
export interface PublicIcon {
  icon_code: string | null;
  status: string | null;
  format: string | null;
  alt_text: string | null;
  url: string | null;
  rights_and_licence: string | null;
  designer: string | null;
}

/** A public custom field value; `term_link` values arrive resolved to concept refs. */
export interface PublicCustomField {
  code: string;
  label: string;
  type: CustomFieldType;
  value: unknown;
}

export interface PublicFieldDef {
  code: string;
  label: string;
  type: CustomFieldType;
  list_code: string | null;
  help: string | null;
}

/** The public concept with the v2 additions (older backs omit them). */
export type PublicConceptV2 = PublicConcept & {
  icons?: PublicIcon[];
  custom_fields?: PublicCustomField[];
};

export interface McpRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

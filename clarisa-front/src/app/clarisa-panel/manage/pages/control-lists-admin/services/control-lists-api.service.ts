import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import {
  FieldImpact,
  FieldRow,
  FieldTypeOption,
  ListDeleteImpact,
  ListDetail,
  ListRecord,
  ListRow,
  NewFieldBody,
  NewListBody,
  OwnerRole,
  PublicResponse
} from '../models/control-lists.models';

/** A call that has not answered by then ends in a `TimeoutError`: dialogs unlock and loaders show their error. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Every HTTP call of the control-lists admin screens (`api/control-lists/…`). */
@Injectable({ providedIn: 'root' })
export class ControlListsApiService {
  private readonly base = `${environment.apiUrl}api/control-lists/`;
  private readonly admin = `${this.base}admin/`;

  constructor(private http: HttpClient) {}

  /** Every call gives up after `REQUEST_TIMEOUT_MS`; a write that did not answer is retried with the same `request_id`. */
  private t<T>(call: Observable<T>): Observable<T> {
    return call.pipe(timeout(REQUEST_TIMEOUT_MS));
  }

  /** The public read address of a list. */
  publicUrl(code: string): string {
    return `${this.base}${code}`;
  }

  // ---- schema ----

  types(): Observable<FieldTypeOption[]> {
    return this.t(this.http.get<FieldTypeOption[]>(`${this.admin}schema/types`));
  }

  owners(): Observable<OwnerRole[]> {
    return this.t(this.http.get<OwnerRole[]>(`${this.admin}schema/owners`));
  }

  lists(): Observable<ListRow[]> {
    return this.t(this.http.get<ListRow[]>(`${this.admin}schema/lists`));
  }

  createList(body: NewListBody): Observable<ListRow> {
    return this.t(this.http.post<ListRow>(`${this.admin}schema/lists`, body));
  }

  list(id: number): Observable<ListDetail> {
    return this.t(this.http.get<ListDetail>(`${this.admin}schema/lists/${id}`));
  }

  sql(id: number): Observable<{ sql: string | null }> {
    return this.t(this.http.get<{ sql: string | null }>(`${this.admin}schema/lists/${id}/sql`));
  }

  deleteImpact(id: number): Observable<ListDeleteImpact> {
    return this.t(this.http.get<ListDeleteImpact>(`${this.admin}schema/lists/${id}/delete-impact`));
  }

  addField(listId: number, body: NewFieldBody): Observable<FieldRow> {
    return this.t(this.http.post<FieldRow>(`${this.admin}schema/lists/${listId}/fields`, body));
  }

  publish(id: number, requestId: string): Observable<ListRow & { sql?: string }> {
    return this.t(this.http.post<ListRow & { sql?: string }>(`${this.admin}schema/lists/${id}/publish`, { request_id: requestId }));
  }

  deleteList(id: number, requestId: string): Observable<{ deleted: boolean }> {
    return this.t(
      this.http.delete<{ deleted: boolean }>(`${this.admin}schema/lists/${id}`, { params: new HttpParams().set('request_id', requestId) })
    );
  }

  fieldImpact(fieldId: number, action: 'delete' | 'type', type?: string): Observable<FieldImpact> {
    let params = new HttpParams().set('action', action);
    if (action === 'type' && type) params = params.set('type', type);
    return this.t(this.http.get<FieldImpact>(`${this.admin}schema/fields/${fieldId}/impact`, { params }));
  }

  renameField(fieldId: number, body: { label: string; code: string; request_id: string }): Observable<FieldRow> {
    return this.t(this.http.patch<FieldRow>(`${this.admin}schema/fields/${fieldId}`, body));
  }

  changeType(fieldId: number, body: { type: string; confirm_affected: number; request_id: string }): Observable<FieldRow> {
    return this.t(this.http.patch<FieldRow>(`${this.admin}schema/fields/${fieldId}/type`, body));
  }

  deleteField(fieldId: number, requestId: string): Observable<unknown> {
    return this.t(this.http.delete(`${this.admin}schema/fields/${fieldId}`, { params: new HttpParams().set('request_id', requestId) }));
  }

  // ---- records (admin route: active and inactive) ----

  records(code: string): Observable<ListRecord[]> {
    return this.t(this.http.get<ListRecord[]>(`${this.admin}data/${encodeURIComponent(code)}`));
  }

  createRecord(code: string, body: Record<string, unknown>): Observable<ListRecord> {
    return this.t(this.http.post<ListRecord>(`${this.admin}data/${encodeURIComponent(code)}`, body));
  }

  updateRecord(code: string, id: number, body: Record<string, unknown>): Observable<ListRecord> {
    return this.t(this.http.patch<ListRecord>(`${this.admin}data/${encodeURIComponent(code)}/${id}`, body));
  }

  /** Deactivates: the record leaves the public list but stays readable by id. */
  deactivateRecord(code: string, id: number, justification?: string): Observable<ListRecord> {
    const body = justification ? { modification_justification: justification } : {};
    return this.t(this.http.delete<ListRecord>(`${this.admin}data/${encodeURIComponent(code)}/${id}`, { body }));
  }

  // ---- public address (no token needed) ----

  /** The live answer of the public address, with its status. */
  publicRead(code: string): Observable<PublicResponse> {
    return this.t(this.http.get<unknown>(this.publicUrl(encodeURIComponent(code)), { observe: 'response' })).pipe(
      map(res => ({ status: res.status, body: res.body }))
    );
  }
}

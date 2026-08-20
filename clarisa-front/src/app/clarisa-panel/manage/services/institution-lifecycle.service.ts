import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/** Kind of link between an institution and the one that replaces it. */
export type InstitutionRelationType = 'NEW' | 'SUCCESSOR' | 'MERGE' | 'SPLIT';

/**
 * Validity status reported by the API for a single institution.
 *
 * `ending` means the end date is still in the future: the institution is valid
 * today and stops being valid on that day. It is what makes it possible to
 * announce a retirement in advance instead of switching the institution off the
 * same day someone types the date.
 */
export type InstitutionValidityStatus = 'active' | 'ending' | 'ended';

/**
 * Validity filter accepted by GET api/institutions. Narrower than the status on
 * purpose: `active` covers everything still usable today, announced retirements
 * included.
 */
export type InstitutionStatusFilter = 'active' | 'ended' | 'all';

/** Which end of a lineage relation an institution sits on. */
export type InstitutionLineageRole = 'predecessor' | 'successor';

/** Lineage edge returned in replacedBy[] / replaces[]. */
export interface InstitutionLineageLink {
  code: number;
  name: string;
  acronym?: string;
  /**
   * Role of the institution NAMED IN THIS ENTRY, not of the record it was read
   * from: `replacedBy` entries are successors, `replaces` entries are
   * predecessors. Optional because it only reaches the panel from an API that
   * already publishes it.
   */
  direction?: InstitutionLineageRole;
  /**
   * The two ends of the relation, as absolute ids: they carry the same pair of
   * values in the predecessor record and in the successor one. They are what
   * makes the direction impossible to read backwards, since neither depends on
   * which array the entry was found in.
   */
  predecessorCode?: number;
  successorCode?: number;
  relationType?: InstitutionRelationType;
  changeDate?: string;
}

/** Raw institution shape returned by GET api/institutions. */
export interface InstitutionApiResponse {
  code: number;
  id?: number;
  name: string;
  acronym?: string;
  websiteLink?: string;
  institutionType?: { code?: number; name?: string };
  /** `created_at` of the row in CLARISA. Not the validity period. */
  added?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  validityStatus?: InstitutionValidityStatus;
  replacedBy?: InstitutionLineageLink[];
  replaces?: InstitutionLineageLink[];
  previousAcronyms?: string[];
  previousNames?: string[];
}

/** Body accepted by PATCH api/institutions/lifecycle/:id. */
export interface InstitutionLifecyclePayload {
  startDate?: string | null;
  endDate?: string | null;
  replacedByInstitutionId?: number | null;
  relationType?: InstitutionRelationType;
  changeDate?: string | null;
  note?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InstitutionLifecycleService {
  urlApi = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Lists institutions, optionally narrowed by validity status (default all). */
  getInstitutions(
    status: InstitutionStatusFilter = 'all',
  ): Observable<InstitutionApiResponse[]> {
    const params = status && status !== 'all' ? { status } : {};
    return this.http.get<InstitutionApiResponse[]>(
      `${this.urlApi}api/institutions`,
      { params },
    );
  }

  /** Updates validity dates and lineage of a single institution. */
  updateLifecycle(
    id: number,
    body: InstitutionLifecyclePayload,
  ): Observable<InstitutionApiResponse> {
    return this.http.patch<InstitutionApiResponse>(
      `${this.urlApi}api/institutions/lifecycle/${id}`,
      body,
    );
  }
}

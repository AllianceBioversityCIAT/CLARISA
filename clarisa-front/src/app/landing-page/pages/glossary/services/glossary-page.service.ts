import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface GlossaryTermPortfolio {
  id: number;
  name: string;
  acronym?: string;
}

export interface GlossaryTerm {
  /**
   * Permanent id of this entry: it survives edits to the wording, and it is
   * what the persistent URI `https://clarisa.cgiar.org/glossary/term/{termId}`
   * points to. Unlike `groupId`, it is unique. Absent on an older API.
   */
  termId?: number;
  term: string;
  /** Synonyms, acronyms or older wording, e.g. `["IA"]`. `[]` when none. */
  alternativeLabels?: string[];
  /**
   * The concept this entry belongs to. Two entries that share it are the same
   * term defined for different portfolios; an entry that stands alone reports
   * a value of its own. Absent on an older API, which the page treats as "each
   * entry is its own concept".
   */
  groupId?: number;
  definition: string;
  /** Document or body the definition comes from. Null until attributed. */
  source?: string | null;
  /** Link to the source, when it has a public one. */
  sourceUrl?: string | null;
  /** Date of the referenced material, `YYYY-MM-DD`. Not the row's own date. */
  referenceDate?: string | null;
  portfolios: GlossaryTermPortfolio[];
  /**
   * Persistent URI of the term in the MELIAF taxonomy, e.g.
   * `https://api.clarisa.cgiar.org/meliaf-taxonomy/391`. Null for a term that is
   * not in the taxonomy yet; absent on an API older than v2's taxonomy keys.
   */
  termUri?: string | null;
  /** `approved` or `deprecated` in the taxonomy. Null/absent like `termUri`. */
  taxonomyStatus?: string | null;
  /** `termId` of the term that replaces this one once it is retired; null while current. */
  replacedByTermId?: number | null;
}

/** Glossary collection of the MELIAF taxonomy: where the copy of the glossary lives. */
const TAXONOMY_CONCEPTS_PATH = 'api/meliaf-taxonomy/concepts';
const TAXONOMY_GLOSSARY_COLLECTION = 'glossary';

/** Formats `GET api/glossary/export` offers. */
export type GlossaryExportFormat = 'json' | 'csv' | 'skos';

@Injectable({
  providedIn: 'root'
})
export class GlossaryPageService {
  urlApi = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * v2 and not v1: same terms and keys, plus the taxonomy's `termUri` and
   * `taxonomyStatus`. v1 stays as it is for PRMS and the other consumers.
   */
  getGlossary(): Observable<GlossaryTerm[]> {
    return this.http.get<GlossaryTerm[]>(`${this.urlApi}api/v2/glossary`);
  }

  /**
   * The terms no longer in use (`?show=inactive`), same keys as `getGlossary`.
   * Only asked for on the permalink of a term that is not among the active
   * ones: the back sends the persistent URI of a retired term there.
   */
  getInactiveGlossary(): Observable<GlossaryTerm[]> {
    return this.http.get<GlossaryTerm[]>(`${this.urlApi}api/v2/glossary`, { params: new HttpParams().set('show', 'inactive') });
  }

  /**
   * Term ids of the glossary that the taxonomy search finds for `query`, best
   * match first. That search forgives typos and word order ("outcme" finds
   * "Outcome"), which the page's own search does not. Ids only: the page draws
   * the cards from the data it already has.
   */
  searchSimilarTermIds(query: string): Observable<number[]> {
    const params = new HttpParams().set('q', query).set('collection', TAXONOMY_GLOSSARY_COLLECTION);
    return this.http
      .get<{ term_id: number }[]>(`${this.urlApi}${TAXONOMY_CONCEPTS_PATH}`, { params })
      .pipe(
        map(concepts =>
          (Array.isArray(concepts) ? concepts : []).map(concept => Number(concept?.term_id)).filter(id => Number.isInteger(id) && id > 0)
        )
      );
  }

  /**
   * The download link of the whole glossary. A plain URL and not a request: the
   * API answers with an attachment, so the browser saves it on its own.
   */
  exportUrl(format: GlossaryExportFormat): string {
    return `${this.urlApi}api/glossary/export?format=${format}`;
  }

  getPortfolios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlApi}api/portfolios?show=all`);
  }
}

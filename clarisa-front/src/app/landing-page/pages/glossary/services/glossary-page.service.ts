import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}

/** Formats `GET api/glossary/export` offers. */
export type GlossaryExportFormat = 'json' | 'csv' | 'skos';

@Injectable({
  providedIn: 'root'
})
export class GlossaryPageService {
  urlApi = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getGlossary(): Observable<GlossaryTerm[]> {
    return this.http.get<GlossaryTerm[]>(`${this.urlApi}api/glossary`);
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

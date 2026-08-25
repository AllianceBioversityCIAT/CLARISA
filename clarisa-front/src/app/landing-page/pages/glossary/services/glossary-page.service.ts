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
  term: string;
  definition: string;
  portfolios: GlossaryTermPortfolio[];
}

@Injectable({
  providedIn: 'root'
})
export class GlossaryPageService {
  urlApi = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getGlossary(): Observable<GlossaryTerm[]> {
    return this.http.get<GlossaryTerm[]>(`${this.urlApi}api/glossary`);
  }

  getPortfolios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlApi}api/portfolios?show=all`);
  }
}

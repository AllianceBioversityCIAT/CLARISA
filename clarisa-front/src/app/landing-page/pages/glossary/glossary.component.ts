import { Component, OnInit } from '@angular/core';
import { GlossaryPageService, GlossaryTerm } from './services/glossary-page.service';

@Component({
  selector: 'app-glossary',
  templateUrl: './glossary.component.html',
  styleUrls: ['./glossary.component.scss']
})
export class GlossaryComponent implements OnInit {
  terms: GlossaryTerm[] = [];
  portfolios: any[] = [];
  searchText: string = '';
  selectedPortfolioCode: number | null = null;
  loading: boolean = true;
  page: number = 1;
  pageSize: number = 10;

  constructor(private _glossaryPageService: GlossaryPageService) {}

  ngOnInit(): void {
    this._glossaryPageService.getGlossary().subscribe({
      next: terms => {
        this.terms = terms ?? [];
        this.loading = false;
      },
      error: () => {
        this.terms = [];
        this.loading = false;
      }
    });
    this._glossaryPageService.getPortfolios().subscribe(portfolios => {
      this.portfolios = portfolios ?? [];
    });
  }

  get filteredTerms(): GlossaryTerm[] {
    const search = this.searchText.trim().toLowerCase();
    return this.terms.filter(term => {
      const matchesSearch =
        !search || term.term?.toLowerCase().includes(search) || term.definition?.toLowerCase().includes(search);
      const matchesPortfolio =
        this.selectedPortfolioCode == null || term.portfolios?.some(portfolio => portfolio.id === this.selectedPortfolioCode);
      return matchesSearch && matchesPortfolio;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTerms.length / this.pageSize));
  }

  get pagedTerms(): GlossaryTerm[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredTerms.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  selectPortfolio(code: number | null) {
    this.selectedPortfolioCode = this.selectedPortfolioCode === code ? null : code;
    this.page = 1;
  }

  onSearchChange() {
    this.page = 1;
  }

  // Deterministic color per portfolio (cycles a fixed palette by id)
  portfolioColorClass(id: number): string {
    return 'chip-color-' + (Math.abs(id ?? 0) % 5);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page = page;
    document.querySelector('.glossary-section')?.scrollIntoView?.({ behavior: 'smooth' });
  }
}

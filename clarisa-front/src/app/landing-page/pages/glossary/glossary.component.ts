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
  selectedLetter: string | null = null;
  loading: boolean = true;

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

  // Every ACTIVE portfolio is offered as a filter (closed ones, e.g. 2016-2021, are hidden)
  get filterPortfolios(): any[] {
    return this.portfolios.filter(portfolio => portfolio.is_active !== 0 && portfolio.is_active !== false);
  }

  // Terms matching the portfolio filter (base set for the letter index)
  private get portfolioFilteredTerms(): GlossaryTerm[] {
    return this.terms.filter(
      term => this.selectedPortfolioCode == null || term.portfolios?.some(portfolio => portfolio.id === this.selectedPortfolioCode)
    );
  }

  // Only the initials that exist among the current terms
  get availableLetters(): string[] {
    const letters = new Set<string>();
    for (const term of this.portfolioFilteredTerms) {
      const initial = term.term?.trim().charAt(0).toUpperCase();
      if (initial) {
        letters.add(initial);
      }
    }
    return Array.from(letters).sort();
  }

  get filteredTerms(): GlossaryTerm[] {
    const search = this.searchText.trim().toLowerCase();
    return this.portfolioFilteredTerms
      .filter(term => {
        const matchesSearch =
          !search || term.term?.toLowerCase().includes(search) || term.definition?.toLowerCase().includes(search);
        const matchesLetter = this.selectedLetter == null || term.term?.trim().toUpperCase().startsWith(this.selectedLetter);
        return matchesSearch && matchesLetter;
      })
      .sort((a, b) => (a.term ?? '').localeCompare(b.term ?? ''));
  }

  selectPortfolio(code: number | null) {
    this.selectedPortfolioCode = this.selectedPortfolioCode === code ? null : code;
    if (this.selectedLetter && !this.availableLetters.includes(this.selectedLetter)) {
      this.selectedLetter = null;
    }
  }

  selectLetter(letter: string) {
    this.selectedLetter = this.selectedLetter === letter ? null : letter;
  }

  // "CGIAR portfolio 2022-2024" -> "Portfolio 2022-2024" · "CGIAR general" -> "General"
  portfolioLabel(name: string): string {
    const stripped = (name ?? '').replace(/^CGIAR\s+/i, '').trim();
    return stripped ? stripped.charAt(0).toUpperCase() + stripped.slice(1) : name;
  }

  // Deterministic color per portfolio (cycles a fixed palette by id)
  portfolioColorClass(id: number): string {
    return 'chip-color-' + (Math.abs(id ?? 0) % 5);
  }
}

import { Component, OnInit } from '@angular/core';
import { GlossaryPageService, GlossaryTerm } from './services/glossary-page.service';

/**
 * Explicit locale for every comparison: with no argument, `localeCompare`
 * follows the browser's, so the same glossary could order differently for two
 * readers. The content is English.
 */
const LOCALE = 'en';

/** Fixed English month names: the glossary content is English regardless of the reader's locale. */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

@Component({
  selector: 'app-glossary',
  templateUrl: './glossary.component.html',
  styleUrls: ['./glossary.component.scss']
})
export class GlossaryComponent implements OnInit {
  /** Visible text per definition, so the search getter parses each one once. */
  private readonly visibleTextCache = new Map<string, string>();
  /** Repaired markup per definition; the template asks once per change detection pass. */
  private readonly renderableCache = new Map<string, string>();

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
    return Array.from(letters).sort((a, b) => a.localeCompare(b, LOCALE));
  }

  get filteredTerms(): GlossaryTerm[] {
    const search = this.searchText.trim().toLowerCase();
    return this.portfolioFilteredTerms
      .filter(term => {
        const matchesSearch =
          !search ||
          term.term?.toLowerCase().includes(search) ||
          // Definitions are stored with markup (`<br>`, `<a href>`, `&bull;`),
          // so searching the raw string matched tag names and URLs the reader
          // never sees: typing "href" or "br" returned hits. The comparison is
          // against the visible text instead.
          this.visibleText(term.definition).includes(search);
        const matchesLetter = this.selectedLetter == null || term.term?.trim().toUpperCase().startsWith(this.selectedLetter);
        return matchesSearch && matchesLetter;
      })
      .sort((a, b) => (a.term ?? '').localeCompare(b.term ?? '', LOCALE));
  }

  /**
   * A definition as it can be handed to `[innerHTML]`.
   *
   * Angular sanitises the markup itself — scripts, event handlers and
   * `javascript:` URLs never survive — so this only repairs an attribute the
   * browser cannot parse: several definitions were imported from CSV with
   * doubled quotes, `href=""https://…""`. The parser reads that as an empty
   * `href` and the link silently leads nowhere, which is what "Climate change
   * tag" does today on this page. The documentation viewer rebuilds the
   * attribute in its own parser, so the same term reads correctly there and
   * broken here.
   *
   * The stored value is the real defect and should be corrected in the admin
   * panel; this keeps the page honest until it is, and for the next import that
   * repeats it.
   */
  renderable(definition: string | null | undefined): string {
    if (!definition) {
      return '';
    }
    const cached = this.renderableCache.get(definition);
    if (cached !== undefined) {
      return cached;
    }
    const repaired = definition.replace(/(\w+)=""([^"]*)""/g, '$1="$2"');
    this.renderableCache.set(definition, repaired);
    return repaired;
  }

  /**
   * The visible text of a definition, lowercased and cached.
   *
   * Definitions carry markup in the database, and parsing happens in an inert
   * container: nothing is executed and nothing is attached to the document.
   * Cached because this runs inside a getter that Angular re-evaluates on every
   * change detection pass, once per term.
   */
  private visibleText(definition: string | null | undefined): string {
    if (!definition) {
      return '';
    }
    const cached = this.visibleTextCache.get(definition);
    if (cached !== undefined) {
      return cached;
    }
    const holder = document.createElement('template');
    holder.innerHTML = definition;
    const text = (holder.content.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    this.visibleTextCache.set(definition, text);
    return text;
  }

  /**
   * The source link, only when it actually resolves to http(s).
   *
   * The value is typed in the admin panel, so it reaches this page as user
   * input. Angular already refuses to bind a `javascript:` URL to `[href]`,
   * but it does so by rewriting it to `unsafe:…`, which renders a link that
   * looks real and leads nowhere. Checking here means a bad URL shows the
   * source as plain text instead of a broken link.
   */
  safeSourceUrl(url: string | null | undefined): string | null {
    const candidate = (url ?? '').trim();
    if (!candidate) {
      return null;
    }
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : null;
    } catch {
      return null;
    }
  }

  /**
   * A reference date as a readable month and year, e.g. `2026-09-07` -> "September 2026".
   *
   * Parsed by parts and never with `new Date('2026-09-07')`: that form is read
   * as UTC midnight, and formatting it in a timezone west of Greenwich — Cali
   * included — prints the previous day, which for a date near a month boundary
   * prints the previous month too.
   */
  referenceDateLabel(value: string | null | undefined): string {
    const raw = (value ?? '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) {
      return raw;
    }
    const [, year, month] = match;
    const monthName = MONTH_NAMES[Number(month) - 1];
    return monthName ? `${monthName} ${year}` : raw;
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

import { Component, OnInit } from '@angular/core';
import { GlossaryPageService, GlossaryTerm, GlossaryTermPortfolio } from './services/glossary-page.service';

/**
 * Un concepto tal como se dibuja: sus versiones, los portafolios que cubre
 * entre todas, y cuál se está leyendo.
 */
export class GlossaryCard {
  constructor(
    public term: string,
    /** Las versiones del concepto, del portafolio más reciente al más antiguo. */
    public versions: GlossaryTerm[],
    /** Todos los portafolios que cubre el concepto entre sus versiones. */
    public portfolios: GlossaryTermPortfolio[],
    /** Índice dentro de `versions` de la definición visible. */
    public shown: number
  ) {}

  /**
   * La versión que la tarjeta está mostrando. Cambiar `shown` —lo que hace una
   * pestaña— cambia con ella la definición y la procedencia, sin reconstruir
   * la tarjeta ni volver a agrupar.
   */
  private get visible(): GlossaryTerm {
    return this.versions[this.shown] ?? this.versions[0];
  }

  get definition(): string {
    return this.visible?.definition ?? '';
  }

  get source(): string | null | undefined {
    return this.visible?.source;
  }

  get sourceUrl(): string | null | undefined {
    return this.visible?.sourceUrl;
  }

  get referenceDate(): string | null | undefined {
    return this.visible?.referenceDate;
  }
}

/**
 * Explicit locale for every comparison: with no argument, `localeCompare`
 * follows the browser's, so the same glossary could order differently for two
 * readers. The content is English.
 */
const LOCALE = 'en';

/** Fixed English month names: the glossary content is English regardless of the reader's locale. */
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
  /**
   * One card per concept, not per record.
   *
   * A term that means something different in each portfolio is published once
   * per version, and drawing them as separate cards read as two unrelated
   * entries with the same name. Each card shows the definition that applies —
   * the one of the portfolio being filtered, or the most recent one — and the
   * chips of every portfolio the concept covers.
   *
   * A field and not a getter: it is rebuilt when the data or the filter
   * changes, so change detection never rebuilds 70 objects per pass.
   */
  cards: GlossaryCard[] = [];
  /** Versions per concept, in the order the API returned them. */
  private groups: GlossaryTerm[][] = [];
  /** Start year per portfolio id, to tell which version is the current one. */
  private portfolioStartYear = new Map<number, number>();
  portfolios: any[] = [];
  searchText: string = '';
  selectedPortfolioCode: number | null = null;
  selectedLetter: string | null = null;
  loading: boolean = true;
  /**
   * True once the reader picks a pill themselves. The portfolio list arrives
   * from its own request, so the default must not overwrite a choice made
   * while that request was still in flight.
   */
  private portfolioChosenByReader = false;

  constructor(private _glossaryPageService: GlossaryPageService) {}

  ngOnInit(): void {
    this._glossaryPageService.getGlossary().subscribe({
      next: terms => {
        this.terms = terms ?? [];
        this.buildGroups();
        this.rebuildCards();
        this.loading = false;
      },
      error: () => {
        this.terms = [];
        this.groups = [];
        this.cards = [];
        this.loading = false;
      }
    });
    this._glossaryPageService.getPortfolios().subscribe(portfolios => {
      this.portfolios = portfolios ?? [];
      this.portfolioStartYear = new Map(
        this.portfolios.filter(portfolio => typeof portfolio.start_date === 'number').map(portfolio => [portfolio.code, portfolio.start_date])
      );
      this.applyDefaultPortfolio();
      this.rebuildCards();
    });
  }

  // Every ACTIVE portfolio is offered as a filter (closed ones, e.g. 2016-2021, are hidden)
  get filterPortfolios(): any[] {
    return this.portfolios.filter(portfolio => portfolio.is_active !== 0 && portfolio.is_active !== false);
  }

  /**
   * The page opens on the current portfolio's terms instead of on all of them:
   * reading the 2022-2024 definitions next to the 2025-2030 ones made the table
   * look self-contradictory (asked by Nicoleta on 2026-09-08).
   *
   * The portfolio is chosen by its start year among the active ones, never by a
   * hardcoded code, so the day 2031-2036 is opened this default follows without
   * a release. Portfolios with no start year ("CGIAR general") are skipped for
   * the default but still offered as pills, and if none qualifies the page
   * falls back to showing everything.
   *
   * Nothing is hidden for good: "All portfolios" is one click away, and the
   * terms that belong only to an older portfolio are reachable from its pill.
   */
  private applyDefaultPortfolio(): void {
    if (this.portfolioChosenByReader) {
      return;
    }
    const newest = this.filterPortfolios.filter(portfolio => typeof portfolio.start_date === 'number').sort((a, b) => b.start_date - a.start_date)[0];
    this.selectedPortfolioCode = newest?.code ?? null;
  }

  /**
   * Groups the published entries by concept. An API that does not send
   * `groupId` — or an entry that was never related — leaves every entry on its
   * own, which is exactly how the page behaved before.
   */
  private buildGroups(): void {
    const byGroup = new Map<string, GlossaryTerm[]>();
    this.terms.forEach((term, index) => {
      const key = term.groupId == null ? `single-${index}` : `group-${term.groupId}`;
      byGroup.set(key, [...(byGroup.get(key) ?? []), term]);
    });
    this.groups = [...byGroup.values()];
  }

  /** The newest portfolio a version covers; 0 when none of them has a year. */
  private recencyOf(version: GlossaryTerm): number {
    return (version.portfolios ?? []).reduce((newest, portfolio) => Math.max(newest, this.portfolioStartYear.get(portfolio.id) ?? 0), 0);
  }

  /** Every portfolio of the concept, newest first, without repeating one. */
  private portfoliosOf(versions: GlossaryTerm[]): GlossaryTermPortfolio[] {
    const byId = new Map<number, GlossaryTermPortfolio>();
    for (const version of versions) {
      for (const portfolio of version.portfolios ?? []) {
        byId.set(portfolio.id, portfolio);
      }
    }
    return [...byId.values()].sort((a, b) => (this.portfolioStartYear.get(b.id) ?? 0) - (this.portfolioStartYear.get(a.id) ?? 0));
  }

  /**
   * The card of a concept: the definition of the portfolio being filtered, or
   * the most recent one when the reader is looking at all of them, carrying the
   * chips of every portfolio the concept covers.
   */
  private cardFor(versions: GlossaryTerm[]): GlossaryCard | null {
    const shown =
      this.selectedPortfolioCode == null
        ? versions.reduce((newest, version) => (this.recencyOf(version) > this.recencyOf(newest) ? version : newest), versions[0])
        : versions.find(version => version.portfolios?.some(portfolio => portfolio.id === this.selectedPortfolioCode));

    if (!shown) {
      return null;
    }

    // Las versiones se ordenan del portafolio más reciente al más antiguo, para
    // que las pestañas salgan en ese orden y la vigente quede primero.
    const ordenadas = [...versions].sort((a, b) => this.recencyOf(b) - this.recencyOf(a));
    return new GlossaryCard(shown.term, ordenadas, this.portfoliosOf(versions), Math.max(0, ordenadas.indexOf(shown)));
  }

  private rebuildCards(): void {
    this.cards = this.groups.map(versions => this.cardFor(versions)).filter((card): card is GlossaryCard => card !== null);
  }

  // Concepts matching the portfolio filter (base set for the letter index)
  private get portfolioFilteredTerms(): GlossaryCard[] {
    return this.cards;
  }

  // Only the initials that exist among the current terms
  get availableLetters(): string[] {
    const letters = new Set<string>();
    for (const card of this.portfolioFilteredTerms) {
      const initial = card.term?.trim().charAt(0).toUpperCase();
      if (initial) {
        letters.add(initial);
      }
    }
    return Array.from(letters).sort((a, b) => a.localeCompare(b, LOCALE));
  }

  get filteredTerms(): GlossaryCard[] {
    const search = this.searchText.trim().toLowerCase();
    return this.portfolioFilteredTerms
      .filter(card => {
        const term = this.shownVersion(card);
        const matchesSearch =
          !search ||
          card.term?.toLowerCase().includes(search) ||
          // Se busca en todas las versiones: una palabra que solo aparece en la
          // definición de 2022-2024 tiene que encontrar igual el concepto.
          card.versions.some(version => this.visibleText(version.definition).includes(search)) ||
          // Definitions are stored with markup (`<br>`, `<a href>`, `&bull;`),
          // so searching the raw string matched tag names and URLs the reader
          // never sees: typing "href" or "br" returned hits. The comparison is
          // against the visible text instead.
          this.visibleText(term.definition).includes(search);
        const matchesLetter = this.selectedLetter == null || card.term?.trim().toUpperCase().startsWith(this.selectedLetter);
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

  /** La definición que la tarjeta está mostrando ahora mismo. */
  shownVersion(card: GlossaryCard): GlossaryTerm {
    return card.versions[card.shown] ?? card.versions[0];
  }

  /**
   * El portafolio de una versión, para etiquetar su pestaña. Una versión cubre
   * uno solo cuando el concepto está dividido; si cubriera varios se muestra el
   * más reciente, que es el que la pestaña representa.
   */
  portfolioOf(version: GlossaryTerm): GlossaryTermPortfolio | null {
    const ordenados = [...(version.portfolios ?? [])].sort(
      (a, b) => (this.portfolioStartYear.get(b.id) ?? 0) - (this.portfolioStartYear.get(a.id) ?? 0)
    );
    return ordenados[0] ?? null;
  }

  /**
   * El año de inicio más alto que se conoce, o 0 si ninguno lo trae. Es el
   * criterio de «vigente» de toda la página: por año, nunca por un código fijo,
   * para que el día que exista 2031-2036 la marca se mueva sola.
   */
  private newestStartYear(): number {
    return Math.max(0, ...[...this.portfolioStartYear.values()]);
  }

  /**
   * Si esa versión es la del portafolio vigente. Es lo que Héctor pidió marcar:
   * mirando la tarjeta no se sabía cuál de las dos definiciones se estaba
   * leyendo, ni cuál es la que rige hoy.
   */
  isCurrentVersion(version: GlossaryTerm): boolean {
    const newest = this.newestStartYear();
    return newest > 0 && this.recencyOf(version) === newest;
  }

  showVersion(card: GlossaryCard, index: number): void {
    card.shown = index;
  }

  selectPortfolio(code: number | null) {
    this.portfolioChosenByReader = true;
    this.selectedPortfolioCode = this.selectedPortfolioCode === code ? null : code;
    this.rebuildCards();
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

  /**
   * La etiqueta de la pestaña de una versión.
   *
   * Existe para que la plantilla no tenga que encadenar `portfolioOf(v)?.name`
   * dentro de otra llamada: una versión sin portafolio devolvería `undefined` a
   * un parámetro declarado obligatorio, y eso revienta la compilación de
   * plantillas estrictas en vez de fallar en el navegador.
   */
  versionLabel(version: GlossaryTerm): string {
    const portfolio = this.portfolioOf(version);
    return portfolio ? this.portfolioLabel(portfolio.name) : 'No portfolio';
  }

  /**
   * La etiqueta sin la palabra «Portfolio», para pantallas estrechas. A 390px la
   * versión larga desbordaba el riel y el segundo segmento salía cortado por la
   * mitad, que se lee como un fallo de pintado. El periodo solo ya identifica el
   * portafolio, y la palabra sigue estando en el filtro de arriba.
   */
  shortLabel(name: string): string {
    return this.portfolioLabel(name).replace(/^Portfolio\s+/i, '');
  }

  versionShortLabel(version: GlossaryTerm): string {
    const portfolio = this.portfolioOf(version);
    return portfolio ? this.shortLabel(portfolio.name) : 'No portfolio';
  }

  /**
   * Si un portafolio es el vigente, por su identificador.
   *
   * Hay dos formas del mismo dato en esta pantalla y las dos pasan por aquí: el
   * portafolio que viene dentro de un término (`id`) y el que devuelve
   * `api/portfolios` para las pastillas del filtro (`code`). Son el mismo número
   * —`cardFor` compara `portfolio.id === selectedPortfolioCode` desde antes—,
   * pero el nombre del campo cambia, y duplicar la comparación es exactamente
   * cómo se acaba con dos criterios de «vigente» que se contradicen.
   */
  isCurrentPortfolioId(id: number | null | undefined): boolean {
    const newest = this.newestStartYear();
    return newest > 0 && (this.portfolioStartYear.get(id as number) ?? 0) === newest;
  }

  isCurrentPortfolio(portfolio: GlossaryTermPortfolio): boolean {
    return this.isCurrentPortfolioId(portfolio?.id);
  }
}

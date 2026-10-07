import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { GlossaryComponent } from './glossary.component';
import { GlossaryPageService } from './services/glossary-page.service';
import { environment } from 'src/environments/environment';

describe('GlossaryComponent', () => {
  let component: GlossaryComponent;
  let fixture: ComponentFixture<GlossaryComponent>;
  let mockService: any;
  /** The route params; empty is `landing-page/glossary`, `{ termId }` is a permalink. */
  let params: BehaviorSubject<ParamMap>;

  const terms = [
    { termId: 11, term: 'Action Area', definition: 'Areas of work', portfolios: [{ id: 2, name: 'CGIAR portfolio 2022-2024' }] },
    { termId: 12, term: 'Innovation', definition: 'Something new', portfolios: [{ id: 3, name: 'CGIAR portfolio 2025-2030' }] },
    {
      termId: 13,
      term: 'Shared term',
      definition: 'Belongs to both',
      portfolios: [
        { id: 2, name: 'CGIAR portfolio 2022-2024' },
        { id: 3, name: 'CGIAR portfolio 2025-2030' }
      ]
    },
    { termId: 14, term: 'Orphan', definition: 'No portfolios yet', portfolios: [] },
    // One concept with a definition per portfolio, the way the API publishes it
    // once a term is versioned: two entries sharing a `groupId`.
    {
      termId: 15,
      term: 'Impact',
      groupId: 90,
      definition: 'The 2022-2024 wording',
      portfolios: [{ id: 2, name: 'CGIAR portfolio 2022-2024' }]
    },
    {
      termId: 16,
      term: 'Impact',
      groupId: 90,
      definition: 'The 2025-2030 wording',
      portfolios: [{ id: 3, name: 'CGIAR portfolio 2025-2030' }]
    }
  ];

  beforeEach(async () => {
    params = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    mockService = {
      getGlossary: jest.fn().mockReturnValue(of(terms)),
      exportUrl: jest.fn((format: string) => `https://api.test/api/glossary/export?format=${format}`),
      // Shaped like `GET api/portfolios?show=all` really answers: the default
      // portfolio is picked from `start_date`, so a mock without it would hide
      // that behaviour from every test below.
      getPortfolios: jest.fn().mockReturnValue(
        of([
          { code: 1, name: 'CGIAR portfolio 2016-2021', start_date: 2016, end_date: 2021, acronym: null, is_active: 0 },
          { code: 2, name: 'CGIAR portfolio 2022-2024', start_date: 2022, end_date: 2024, acronym: 'P22', is_active: 1 },
          { code: 3, name: 'CGIAR portfolio 2025-2030', start_date: 2025, end_date: 2030, acronym: 'P25', is_active: 1 },
          { code: 4, name: 'CGIAR general', acronym: null, is_active: 1 }
        ])
      )
    };

    await TestBed.configureTestingModule({
      declarations: [GlossaryComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GlossaryPageService, useValue: mockService },
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlossaryComponent);
    component = fixture.componentInstance;
  });

  /** What a reader does when they want the whole glossary back. */
  const showAllPortfolios = () => component.selectPortfolio(null);

  it('should create and load terms and portfolios', () => {
    fixture.detectChanges();
    // Six published entries, five concepts: `Impact` is one term with a
    // definition per portfolio and the page draws it once.
    expect(component.terms.length).toBe(6);
    expect(component.filteredTerms.length).toBe(3);
    expect(component.portfolios.length).toBe(4);
    expect(component.loading).toBe(false);
  });

  it('should open on the newest active portfolio instead of on every term', () => {
    fixture.detectChanges();
    expect(component.selectedPortfolioCode).toBe(3);
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Impact', 'Innovation', 'Shared term']);
  });

  it('should show every term once the reader asks for all portfolios', () => {
    fixture.detectChanges();
    showAllPortfolios();
    expect(component.selectedPortfolioCode).toBeNull();
    expect(component.filteredTerms.length).toBe(5);
  });

  it('should pick the newest ACTIVE portfolio, not the newest one', () => {
    mockService.getPortfolios.mockReturnValue(
      of([
        { code: 2, name: 'CGIAR portfolio 2022-2024', start_date: 2022, is_active: 1 },
        { code: 3, name: 'CGIAR portfolio 2025-2030', start_date: 2025, is_active: 0 }
      ])
    );
    fixture.detectChanges();
    expect(component.selectedPortfolioCode).toBe(2);
  });

  it('should fall back to every term when no portfolio carries a start year', () => {
    mockService.getPortfolios.mockReturnValue(of([{ code: 4, name: 'CGIAR general', is_active: 1 }]));
    fixture.detectChanges();
    expect(component.selectedPortfolioCode).toBeNull();
    expect(component.filteredTerms.length).toBe(5);
  });

  it('should filter by search text over term and definition (case-insensitive)', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.searchText = 'ACTION';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Action Area']);

    component.searchText = 'belongs';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
  });

  it('should filter by portfolio id', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.selectPortfolio(3);
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Impact', 'Innovation', 'Shared term']);
  });

  it('should combine search and portfolio filter', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.selectPortfolio(3);
    component.searchText = 'shared';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
  });

  it('should toggle the portfolio selection off when clicked twice', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.selectPortfolio(2);
    component.selectPortfolio(2);
    expect(component.selectedPortfolioCode).toBeNull();
    expect(component.filteredTerms.length).toBe(5);
  });

  it('should end loading and keep an empty list when the API fails', () => {
    mockService.getGlossary.mockReturnValue(throwError(() => new Error('down')));
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(component.terms).toEqual([]);
    expect(component.filteredTerms).toEqual([]);
  });

  it('should return terms sorted alphabetically', () => {
    fixture.detectChanges();
    showAllPortfolios();
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Action Area', 'Impact', 'Innovation', 'Orphan', 'Shared term']);
  });

  describe('letter filter', () => {
    beforeEach(() => {
      fixture.detectChanges();
      showAllPortfolios();
    });

    it('should expose only the initials that exist', () => {
      expect(component.availableLetters).toEqual(['A', 'I', 'O', 'S']);
    });

    it('should filter terms by the selected initial and toggle off', () => {
      component.selectLetter('S');
      expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
      component.selectLetter('S');
      expect(component.filteredTerms.length).toBe(5);
    });

    it('should recompute letters when a portfolio is selected and drop an orphan selection', () => {
      component.selectLetter('A');
      component.selectPortfolio(3);
      expect(component.availableLetters).toEqual(['I', 'S']);
      expect(component.selectedLetter).toBeNull();
    });
  });

  describe('portfolio filter pills', () => {
    it('should offer every active portfolio (even without terms) and hide inactive ones', () => {
      mockService.getPortfolios.mockReturnValue(
        of([
          { code: 1, name: 'CGIAR portfolio 2016-2021', is_active: 0 },
          { code: 2, name: 'CGIAR portfolio 2022-2024', is_active: 1 },
          { code: 3, name: 'CGIAR portfolio 2025-2030', is_active: 1 },
          { code: 4, name: 'CGIAR general', is_active: 1 }
        ])
      );
      fixture.detectChanges();
      expect(component.filterPortfolios.map((p: any) => p.code)).toEqual([2, 3, 4]);
    });
  });

  describe('portfolioLabel', () => {
    it('should strip the CGIAR prefix and keep a capital first letter', () => {
      fixture.detectChanges();
      expect(component.portfolioLabel('CGIAR portfolio 2022-2024')).toBe('Portfolio 2022-2024');
      expect(component.portfolioLabel('CGIAR general')).toBe('General');
      expect(component.portfolioLabel('Something else')).toBe('Something else');
    });
  });

  describe('safeSourceUrl', () => {
    it('should keep http and https links', () => {
      fixture.detectChanges();
      expect(component.safeSourceUrl('https://www.cgiar.org/')).toBe('https://www.cgiar.org/');
      expect(component.safeSourceUrl('http://www.cgiar.org/')).toBe('http://www.cgiar.org/');
    });

    it('should refuse a javascript or data URL instead of rendering a dead link', () => {
      // The value is typed in the admin panel. Angular would bind it as
      // `unsafe:javascript:…`, which looks like a working link and is not.
      fixture.detectChanges();
      expect(component.safeSourceUrl('javascript:alert(1)')).toBeNull();
      expect(component.safeSourceUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should refuse anything that is not a URL at all', () => {
      fixture.detectChanges();
      expect(component.safeSourceUrl('www.cgiar.org')).toBeNull();
      expect(component.safeSourceUrl('   ')).toBeNull();
      expect(component.safeSourceUrl(null)).toBeNull();
    });
  });

  describe('the rendered source line', () => {
    const withProvenance = [
      {
        term: 'Impact Area',
        definition: 'A definition',
        source: 'CGIAR 2025-2030 Portfolio Narrative',
        sourceUrl: 'https://www.cgiar.org/',
        referenceDate: '2025-01-15',
        portfolios: []
      },
      { term: 'Plain term', definition: 'No provenance', portfolios: [] }
    ];

    beforeEach(() => {
      mockService.getGlossary.mockReturnValue(of(withProvenance));
      fixture.detectChanges();
      // These fixtures carry no portfolio, so the default filter would hide
      // them; the assertions below are about the source line, not the filter.
      showAllPortfolios();
      fixture.detectChanges();
    });

    it('should not pad the link with whitespace the underline would paint', () => {
      // A line break inside the <a> in the template becomes whitespace inside the
      // anchor, and the underline extends over it: the link read as
      // "_ CGIAR 2025-2030 Portfolio Narrative _" on the published page.
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.card-source a');
      expect(link).toBeTruthy();
      expect(link.textContent).toBe('CGIAR 2025-2030 Portfolio Narrative');
      expect(link.getAttribute('href')).toBe('https://www.cgiar.org/');
      expect(link.getAttribute('rel')).toBe('noopener');
    });

    it('should read as one sentence with the date', () => {
      const line: HTMLElement = fixture.nativeElement.querySelector('.card-source');
      expect(line.textContent.replace(/\s+/g, ' ').trim()).toBe('Source: CGIAR 2025-2030 Portfolio Narrative · January 2025');
    });

    it('should show no source line at all for a term without provenance', () => {
      const lines = fixture.nativeElement.querySelectorAll('.card-source');
      expect(lines.length).toBe(1);
    });
  });

  describe('referenceDateLabel', () => {
    it('should print the month of the stored day, not of the day before', () => {
      // `new Date('2026-09-01')` is UTC midnight; formatted in Cali (UTC-5) it
      // prints 31 August 2026 — the wrong month for the reader.
      fixture.detectChanges();
      expect(component.referenceDateLabel('2026-09-01')).toBe('September 2026');
      expect(component.referenceDateLabel('2025-01-15')).toBe('January 2025');
      expect(component.referenceDateLabel('2024-12-31')).toBe('December 2024');
    });

    it('should return an unrecognised value untouched instead of inventing a date', () => {
      fixture.detectChanges();
      expect(component.referenceDateLabel('Sept 2026')).toBe('Sept 2026');
      expect(component.referenceDateLabel(null)).toBe('');
    });
  });

  // A versioned term used to render as two cards with the same name and one
  // chip each, which read as duplicates instead of as one concept.
  describe('a term with one definition per portfolio', () => {
    const cardsFor = (name: string) => component.filteredTerms.filter(card => card.term === name);

    beforeEach(() => fixture.detectChanges());

    it('is a single card carrying the chips of every portfolio', () => {
      component.selectPortfolio(null);

      const cards = cardsFor('Impact');
      expect(cards).toHaveLength(1);
      expect(cards[0].portfolios.map(p => p.id)).toEqual([3, 2]);
    });

    it('shows the definition of the most recent portfolio when no filter is set', () => {
      component.selectPortfolio(null);

      expect(cardsFor('Impact')[0].definition).toBe('The 2025-2030 wording');
    });

    it('shows the definition of the portfolio being filtered', () => {
      component.selectPortfolio(2);

      const cards = cardsFor('Impact');
      expect(cards).toHaveLength(1);
      expect(cards[0].definition).toBe('The 2022-2024 wording');
      // The chips still say the term exists in both.
      expect(cards[0].portfolios.map(p => p.id)).toEqual([3, 2]);
    });

    it('leaves every other term exactly as it was', () => {
      component.selectPortfolio(null);

      expect(cardsFor('Action Area')).toHaveLength(1);
      expect(cardsFor('Action Area')[0].definition).toBe('Areas of work');
      expect(cardsFor('Orphan')).toHaveLength(1);
    });
  });

  // Lo que Héctor pidió ver: cuál de los portafolios rige hoy. Antes se decía con
  // un punto relleno y sin leyenda en ninguna parte; ahora lo dice la palabra.
  describe('the "Current" mark', () => {
    /** La tarjeta de un término, por su título. */
    const cardEl = (name: string): HTMLElement =>
      Array.from(fixture.nativeElement.querySelectorAll('.glossary-card')).find(
        (card: any) => card.querySelector('h4')?.textContent.trim() === name
      ) as HTMLElement;

    /** El texto de cada segmento del riel de esa tarjeta. */
    const railOf = (name: string): string[] =>
      Array.from(cardEl(name).querySelectorAll('.version-seg')).map((seg: any) => seg.textContent.replace(/\s+/g, ' ').trim());

    beforeEach(() => {
      fixture.detectChanges();
      showAllPortfolios();
      fixture.detectChanges();
    });

    it('is the newest portfolio by start year, and nothing else', () => {
      expect(component.isCurrentPortfolioId(3)).toBe(true); // 2025-2030
      expect(component.isCurrentPortfolioId(2)).toBe(false); // 2022-2024
      expect(component.isCurrentPortfolioId(1)).toBe(false); // 2016-2021, closed
      // "CGIAR general" carries no start year: it is offered as a filter, but it
      // is not a period and cannot be the one in force.
      expect(component.isCurrentPortfolioId(4)).toBe(false);
      expect(component.isCurrentPortfolioId(999)).toBe(false);
      expect(component.isCurrentPortfolioId(null)).toBe(false);
    });

    // 🛑 La regresión que se arregló: el riel estático pintaba `is-current` en
    // TODOS los portafolios de la tarjeta, así que el de 2022-2024 se anunciaba
    // como vigente exactamente igual que el de 2025-2030.
    it('marks only the portfolio in force when one definition covers two', () => {
      const segments = railOf('Shared term');

      expect(segments).toHaveLength(2);
      expect(segments.filter(text => text.includes('Current'))).toHaveLength(1);
      expect(segments.find(text => text.includes('Current'))).toContain('Portfolio 2025-2030');
    });

    it('marks the portfolio in force on a term that only belongs to the older one', () => {
      // Las dos etiquetas —larga y corta— viven las dos en el DOM y el CSS pinta
      // solo una; por eso el texto sale pegado. Lo que importa: no dice 'Current'.
      expect(railOf('Action Area')).toEqual(['Portfolio 2022-20242022-2024']);
    });

    // La marca dice qué portafolio rige, no cuál se está leyendo: son dos cosas
    // distintas y el riel ya dice la segunda con el segmento levantado.
    it('stays on the portfolio in force after the reader opens the older definition', () => {
      expect(railOf('Impact').find(text => text.includes('Current'))).toContain('Portfolio 2025-2030');

      const card = component.filteredTerms.find(item => item.term === 'Impact')!;
      component.showVersion(card, 1);
      fixture.detectChanges();

      expect(card.definition).toBe('The 2022-2024 wording');
      expect(railOf('Impact').find(text => text.includes('Current'))).toContain('Portfolio 2025-2030');
    });

    // La página abre con un portafolio ya elegido; sin la marca no hay manera de
    // saber por qué se está viendo un subconjunto.
    it('explains the default by marking the same portfolio in the filter', () => {
      const pills = Array.from(fixture.nativeElement.querySelectorAll('.filter-pill')).map((pill: any) =>
        pill.textContent.replace(/\s+/g, ' ').trim()
      );

      expect(pills.filter(text => text.includes('Current'))).toHaveLength(1);
      expect(pills.find(text => text.includes('Current'))).toContain('Portfolio 2025-2030');
    });

    // La leyenda: la misma pastilla dentro de la frase de la entradilla, para que
    // la palabra no dependa de que alguien la deduzca.
    it('shows the same tag inside the intro, as the legend', () => {
      const legend: HTMLElement = fixture.nativeElement.querySelector('.glossary-intro .version-seg__now');

      expect(legend).toBeTruthy();
      expect(legend.textContent.trim()).toBe('Current');
      expect(fixture.nativeElement.querySelector('.glossary-intro p').textContent).toContain('in force today');
    });
  });
  describe('alternative labels', () => {
    const withLabels = [
      {
        termId: 21,
        term: 'Impact assessment',
        definition: 'Evaluating the effects of an intervention',
        alternativeLabels: ['IA', 'Impact study'],
        portfolios: []
      },
      { termId: 22, term: 'Outcome', definition: 'A change in behaviour', alternativeLabels: [], portfolios: [] },
      // An older API sends no labels at all.
      { termId: 23, term: 'Output', definition: 'A product of the work', portfolios: [] }
    ];

    beforeEach(() => {
      mockService.getGlossary.mockReturnValue(of(withLabels));
      fixture.detectChanges();
      // No portfolio on these fixtures: the default filter would hide them.
      showAllPortfolios();
      fixture.detectChanges();
    });

    it('should find a term by one of its alternative labels, case-insensitive', () => {
      component.searchText = 'IA';
      expect(component.filteredTerms.map(t => t.term)).toEqual(['Impact assessment']);

      component.searchText = 'impact stu';
      expect(component.filteredTerms.map(t => t.term)).toEqual(['Impact assessment']);
    });

    it('should show the labels under the title only when the term has some', () => {
      const labels = Array.from(fixture.nativeElement.querySelectorAll('.card-alt-labels')).map((el: any) => el.textContent.trim());
      expect(labels).toEqual(['Also known as: IA · Impact study']);
    });
  });

  describe('download links', () => {
    it('should offer JSON, CSV and SKOS from the export endpoint', () => {
      fixture.detectChanges();
      const links = Array.from(fixture.nativeElement.querySelectorAll('.glossary-download a')) as HTMLAnchorElement[];
      expect(links.map(link => link.textContent!.trim())).toEqual(['JSON', 'CSV', 'SKOS']);
      expect(links.map(link => link.getAttribute('href'))).toEqual([
        'https://api.test/api/glossary/export?format=json',
        'https://api.test/api/glossary/export?format=csv',
        'https://api.test/api/glossary/export?format=skos'
      ]);
    });

    it('should build the export URL on the same API base as the glossary', () => {
      const service = new GlossaryPageService({} as any);
      expect(service.exportUrl('skos')).toBe(`${environment.apiUrl}api/glossary/export?format=skos`);
    });
  });

  describe('permalink of a term', () => {
    const openPermalink = (termId: string) => {
      params.next(convertToParamMap({ termId }));
      fixture.detectChanges();
    };

    it('should show only that term, even when the default portfolio would hide it', () => {
      // Action Area belongs only to 2022-2024 and the page defaults to 2025-2030.
      openPermalink('11');
      expect(component.filteredTerms.map(t => t.term)).toEqual(['Action Area']);
      expect(fixture.nativeElement.querySelectorAll('.glossary-card')).toHaveLength(1);
      expect(fixture.nativeElement.querySelector('.glossary-card.is-focused')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.glossary-back').textContent).toContain('Back to all terms');
      expect(fixture.nativeElement.querySelector('.glossary-toolbar')).toBeNull();
    });

    it('should open a versioned concept on the exact version the link names', () => {
      openPermalink('15');
      const [card] = component.filteredTerms;
      expect(card.definition).toBe('The 2022-2024 wording');
      expect(card.termId).toBe(15);
      // The other definition stays one tab away.
      expect(card.versions).toHaveLength(2);
    });

    it('should show a not-found state for an unknown id, with the way back and no spinner', () => {
      openPermalink('999');
      expect(component.loading).toBe(false);
      expect(component.filteredTerms).toEqual([]);
      expect(fixture.nativeElement.querySelector('.glossary-loading')).toBeNull();
      expect(fixture.nativeElement.querySelector('.glossary-empty').textContent).toContain('This term was not found.');
      expect(fixture.nativeElement.querySelector('.glossary-back')).toBeTruthy();
    });

    it('should treat an id that is not a number as not found', () => {
      openPermalink('abc');
      expect(fixture.nativeElement.querySelector('.glossary-empty').textContent).toContain('This term was not found.');
    });

    it('should keep the default portfolio and every filter when no id is present', () => {
      fixture.detectChanges();
      expect(component.focusMode).toBe(false);
      expect(component.selectedPortfolioCode).toBe(3);
      expect(component.filteredTerms.map(t => t.term)).toEqual(['Impact', 'Innovation', 'Shared term']);
      expect(fixture.nativeElement.querySelector('.glossary-toolbar')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.glossary-back')).toBeNull();
    });
  });

  describe('copy link', () => {
    const writeText = jest.fn();

    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      writeText.mockReset();
      fixture.detectChanges();
    });

    afterEach(() => {
      delete (navigator as any).clipboard;
    });

    it('should copy the permalink of the card and say so', async () => {
      writeText.mockResolvedValue(undefined);
      const card = component.filteredTerms.find(item => item.term === 'Innovation')!;
      component.copyLink(card);
      await Promise.resolve();
      fixture.detectChanges();

      expect(writeText).toHaveBeenCalledWith(`${location.origin}/landing-page/glossary/term/12`);
      const cardEl = Array.from(fixture.nativeElement.querySelectorAll('.glossary-card')).find(
        (el: any) => el.querySelector('h4')?.textContent.trim() === 'Innovation'
      ) as HTMLElement;
      expect(cardEl.querySelector('.card-copy')!.textContent).toContain('Copy link');
      expect(cardEl.querySelector('.card-copy__feedback')!.textContent).toContain('Link copied');
    });

    it('should say the copy failed instead of pretending it worked', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      component.copyLink(component.filteredTerms[0]);
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(component.copyFailed).toBe(true);
      expect(fixture.nativeElement.querySelector('.card-copy__feedback').textContent).toContain('Could not copy the link');
    });
  });
});

import { APP_BASE_HREF } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, ROUTES } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';

import { AppRoutingModule } from '../../../app-routing.module';
import { GlossaryComponent } from './glossary.component';
import { GlossaryRoutingModule } from './glossary-routing.module';
import { GlossaryPageService } from './services/glossary-page.service';

/**
 * Contract tests of the public glossary (2026-10-29): coupling with
 * `api/portfolios`, permalinks and routes. They describe today's behaviour so
 * the v2 of the API cannot break the page unnoticed.
 */
describe('Glossary — permalink and routing contract', () => {
  describe('route config', () => {
    it('root router redirects glossary/term/:termId to landing-page/glossary/term/:termId', () => {
      TestBed.configureTestingModule({ imports: [AppRoutingModule], providers: [{ provide: APP_BASE_HREF, useValue: '/' }] });
      const config = TestBed.inject(Router).config;
      const redirect = config.find(route => route.path === 'glossary/term/:termId');
      expect(redirect).toBeDefined();
      expect(redirect!.redirectTo).toBe('landing-page/glossary/term/:termId');
      // pinned as-is: no pathMatch, a prefix redirect.
      expect(redirect!.pathMatch).toBeUndefined();
    });

    it('root router keeps landing-page as the parent of the glossary', () => {
      TestBed.configureTestingModule({ imports: [AppRoutingModule], providers: [{ provide: APP_BASE_HREF, useValue: '/' }] });
      const config = TestBed.inject(Router).config;
      expect(config.some(route => route.path === 'landing-page' && typeof route.loadChildren === 'function')).toBe(true);
    });

    it('glossary child routes are "" and "term/:termId", both rendering GlossaryComponent', () => {
      TestBed.configureTestingModule({ imports: [GlossaryRoutingModule], providers: [{ provide: APP_BASE_HREF, useValue: '/' }] });
      const routes = (TestBed.inject(ROUTES) as unknown as any[]).flat();
      expect(routes.map(route => route.path)).toEqual(['', 'term/:termId']);
      expect(routes.every(route => route.component === GlossaryComponent)).toBe(true);
    });

    it('navigating glossary/term/42 lands on landing-page/glossary/term/42', async () => {
      TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'glossary/term/:termId', redirectTo: 'landing-page/glossary/term/:termId' },
            { path: 'landing-page/glossary/term/:termId', component: GlossaryComponent }
          ])
        ]
      });
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/glossary/term/42');
      expect(router.url).toBe('/landing-page/glossary/term/42');
    });
  });

  describe('component', () => {
    let component: GlossaryComponent;
    let mockService: any;
    let params: BehaviorSubject<any>;
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

    const portfolios = [
      // `id` and `code` deliberately differ: only `code` matches term.portfolios[].id.
      { id: 901, code: 2, name: 'CGIAR portfolio 2022-2024', start_date: 2022, is_active: 1 },
      { id: 902, code: 3, name: 'CGIAR portfolio 2025-2030', start_date: 2025, is_active: 1 }
    ];

    const build = (terms: any[]) => {
      params = new BehaviorSubject(convertToParamMap({}));
      mockService = {
        getGlossary: jest.fn().mockReturnValue(of(terms)),
        getPortfolios: jest.fn().mockReturnValue(of(portfolios)),
        exportUrl: jest.fn()
      };
      TestBed.configureTestingModule({
        declarations: [GlossaryComponent],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: GlossaryPageService, useValue: mockService },
          { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } }
        ]
      });
      component = TestBed.createComponent(GlossaryComponent).componentInstance;
      component.ngOnInit();
      return component;
    };

    afterEach(() => {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      }
    });

    it('matches term.portfolios[].id against portfolio.code (the default pill is a `code`)', () => {
      build([{ termId: 1, term: 'Match', definition: 'd', portfolios: [{ id: 3, name: 'P25' }] }]);
      expect(component.selectedPortfolioCode).toBe(3);
      expect(component.filteredTerms.map(card => card.term)).toEqual(['Match']);
    });

    it('does NOT match term.portfolios[].id against portfolio.id (only `code` counts)', () => {
      // 902 is the `id` of the 2025-2030 portfolio, but the term points at `code` 3 through id 902 => no match.
      build([{ termId: 1, term: 'ById', definition: 'd', portfolios: [{ id: 902, name: 'P25' }] }]);
      expect(component.selectedPortfolioCode).toBe(3);
      expect(component.filteredTerms).toEqual([]);
    });

    it('isCurrentPortfolioId takes the `code` of api/portfolios, not its `id`', () => {
      build([]);
      expect(component.isCurrentPortfolioId(3)).toBe(true);
      expect(component.isCurrentPortfolioId(2)).toBe(false);
      expect(component.isCurrentPortfolioId(902)).toBe(false);
    });

    it('permalink base path is exactly `${origin}/landing-page/glossary/term/{termId}`', () => {
      build([]);
      expect(component.permalinkOf(77)).toBe(`${location.origin}/landing-page/glossary/term/77`);
      expect(component.permalinkOf(77)).toMatch(/\/landing-page\/glossary\/term\/77$/);
      // pinned as-is: it differs from the SKOS URI (`/glossary/term/{id}`, root path) that the back emits;
      // the root redirect above is what makes the SKOS URI resolve.
      expect(component.permalinkOf(77)).not.toBe(`${location.origin}/glossary/term/77`);
    });

    it('a deprecated term with a replacement renders like any other (editorialStatus / replacedByTermId ignored)', () => {
      build([
        {
          termId: 1,
          term: 'Old',
          definition: 'd',
          editorialStatus: 'deprecated',
          replacedByTermId: 2,
          portfolios: [{ id: 3, name: 'P25' }]
        },
        { termId: 2, term: 'New', definition: 'd', portfolios: [{ id: 3, name: 'P25' }] }
      ]);
      // pinned as-is: both cards are shown, nothing hides or flags the deprecated one.
      expect(component.filteredTerms.map(card => card.term)).toEqual(['New', 'Old']);
      const old = component.filteredTerms.find(card => card.term === 'Old')!;
      expect(old.versions[0]).toEqual(expect.objectContaining({ editorialStatus: 'deprecated', replacedByTermId: 2 }));
      expect(Object.keys(old)).not.toContain('editorialStatus');
      expect((old as any).editorialStatus).toBeUndefined();
      expect((old as any).replacedByTermId).toBeUndefined();
    });
  });
});

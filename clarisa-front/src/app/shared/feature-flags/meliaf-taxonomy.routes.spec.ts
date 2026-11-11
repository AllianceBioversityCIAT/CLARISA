import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route, Router, Routes } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { MELIAF_TAXONOMY_HIDDEN, isMeliafTaxonomyScope } from './meliaf-taxonomy';
import { LANDING_PAGE_ROUTES, conceptsRoute } from '../../landing-page/landing-page-routing.module';
import { MANAGE_ROUTES, conceptsAdminRoutes } from '../../clarisa-panel/manage/manage-routing.module';

@Component({ template: '' })
class StubComponent {}

/** Every route of a tree, children included. */
const flatten = (routes: Routes): Route[] => routes.flatMap(route => [route, ...flatten(route.children ?? [])]);
const byPath = (routes: Routes, path: string) => flatten(routes).filter(route => route.path === path);

describe('MELIAF taxonomy switch — routes', () => {
  it('is on', () => {
    expect(MELIAF_TAXONOMY_HIDDEN).toBe(true);
  });

  describe('public site (landing-page)', () => {
    it('never loads the module while hidden, and loads it again with the switch off', () => {
      const hidden = byPath(LANDING_PAGE_ROUTES, 'concepts');
      expect(hidden).toHaveLength(1);
      expect(hidden[0]).toEqual(conceptsRoute(true));
      expect(hidden[0].loadChildren).toBeUndefined();
      expect(flatten(hidden[0].children ?? []).every(route => !!route.redirectTo && !route.component && !route.loadChildren)).toBe(true);

      expect(conceptsRoute(false).loadChildren).toBeDefined();
    });

    describe('navigation while hidden', () => {
      let router: Router;

      beforeEach(() => {
        // The landing routes that matter here, with the glossary stubbed (its
        // real module is lazy and calls the API).
        const landing = LANDING_PAGE_ROUTES[0].children!.filter(route => /concepts/.test(String(route.path)));
        TestBed.configureTestingModule({
          declarations: [StubComponent],
          imports: [
            RouterTestingModule.withRoutes([
              {
                path: 'landing-page',
                children: [
                  ...landing,
                  {
                    path: 'glossary',
                    children: [
                      { path: '', component: StubComponent },
                      { path: 'term/:termId', component: StubComponent }
                    ]
                  }
                ]
              }
            ])
          ]
        });
        router = TestBed.inject(Router);
      });

      const land = async (url: string) => {
        await router.navigateByUrl(url);
        return router.url;
      };

      it('sends a concept detail to its glossary permalink', async () => {
        expect(await land('/landing-page/concepts/meliaf-taxonomy/391')).toBe('/landing-page/glossary/term/391');
        expect(await land('/landing-page/concepts/391')).toBe('/landing-page/glossary/term/391');
        expect(await land('/landing-page/concepts/other-scheme/12?x=1')).toBe('/landing-page/glossary/term/12');
      });

      it('sends the legacy global-concepts addresses the same way', async () => {
        expect(await land('/landing-page/global-concepts/meliaf-taxonomy/391')).toBe('/landing-page/glossary/term/391');
        expect(await land('/landing-page/global-concepts/391')).toBe('/landing-page/glossary/term/391');
        expect(await land('/landing-page/global-concepts')).toBe('/landing-page/glossary');
        expect(await land('/landing-page/global-concepts/meliaf-taxonomy')).toBe('/landing-page/glossary');
      });

      it('sends everything else under concepts to the glossary (no form renders)', async () => {
        for (const url of [
          '/landing-page/concepts',
          '/landing-page/concepts?scheme=meliaf-taxonomy',
          '/landing-page/concepts/developers',
          '/landing-page/concepts/guide',
          '/landing-page/concepts/requests/verify?token=abc',
          '/landing-page/concepts/requests/12?token=abc',
          '/landing-page/concepts/meliaf-taxonomy',
          '/landing-page/concepts/a/b/c'
        ]) {
          expect(await land(url)).toBe('/landing-page/glossary');
        }
      });
    });
  });

  describe('admin panel (manage)', () => {
    it('never loads the module while hidden, and loads it again with the switch off', () => {
      const hidden = flatten(MANAGE_ROUTES).filter(route => /concepts-admin/.test(String(route.path)));
      expect(hidden.map(route => route.path).sort()).toEqual(['concepts-admin', 'global-concepts-admin']);
      hidden.forEach(route => {
        expect(route.loadChildren).toBeUndefined();
        expect(route.redirectTo).toBe('/clarisa-panel/manage');
      });

      const shown = byPath(conceptsAdminRoutes(false), 'concepts-admin');
      expect(shown[0].loadChildren).toBeDefined();
    });

    it('sends concepts-admin and global-concepts-admin to the panel home', async () => {
      const children = MANAGE_ROUTES[0].children!.filter(route => /concepts-admin/.test(String(route.path)));
      TestBed.configureTestingModule({
        declarations: [StubComponent],
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'clarisa-panel/manage', children: [{ path: '', pathMatch: 'full', component: StubComponent }, ...children] }
          ])
        ]
      });
      const router = TestBed.inject(Router);

      for (const url of [
        '/clarisa-panel/manage/concepts-admin',
        '/clarisa-panel/manage/concepts-admin/requests',
        '/clarisa-panel/manage/global-concepts-admin'
      ]) {
        await router.navigateByUrl(url);
        expect(router.url).toBe('/clarisa-panel/manage');
      }
    });
  });

  it('recognises the API key scopes of the module', () => {
    expect(['concepts:read', 'concepts:request', 'concepts:write', 'concepts:review'].every(isMeliafTaxonomyScope)).toBe(true);
    expect(['institutions:read', 'toc:read', 'email:send', '', null].some(isMeliafTaxonomyScope)).toBe(false);
  });
});

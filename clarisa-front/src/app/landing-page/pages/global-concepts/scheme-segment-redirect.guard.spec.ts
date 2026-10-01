import { UrlSegment, convertToParamMap } from '@angular/router';
import { SchemeSegmentRedirectGuard, defaultSchemeConceptMatcher } from './global-concepts-routing.module';

describe('SchemeSegmentRedirectGuard', () => {
  it('sends /landing-page/concepts/:scheme to the list with ?scheme=', () => {
    const tree = {};
    const router = { createUrlTree: jest.fn(() => tree) } as any;
    const guard = new SchemeSegmentRedirectGuard(router);
    const out = guard.canActivate({
      paramMap: convertToParamMap({ scheme: 'concepts' }),
      queryParams: { q: 'impact' },
    } as any);
    expect(out).toBe(tree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/landing-page/concepts'], {
      queryParams: { q: 'impact', scheme: 'concepts' },
    });
  });
});

describe('defaultSchemeConceptMatcher', () => {
  const seg = (...paths: string[]) => paths.map(path => new UrlSegment(path, {}));

  it('takes /landing-page/concepts/2374 as a concept of the default scheme', () => {
    const match = defaultSchemeConceptMatcher(seg('2374'));
    expect(match?.posParams?.['termId'].path).toBe('2374');
  });

  it('leaves names (guide, developers, a scheme) and two segments to the other routes', () => {
    expect(defaultSchemeConceptMatcher(seg('guide'))).toBeNull();
    expect(defaultSchemeConceptMatcher(seg('prms'))).toBeNull();
    expect(defaultSchemeConceptMatcher(seg('prms', '12'))).toBeNull();
  });
});

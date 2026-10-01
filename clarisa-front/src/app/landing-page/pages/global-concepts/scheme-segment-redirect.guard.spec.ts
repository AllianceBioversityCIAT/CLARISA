import { convertToParamMap } from '@angular/router';
import { SchemeSegmentRedirectGuard } from './global-concepts-routing.module';

describe('SchemeSegmentRedirectGuard', () => {
  it('sends /landing-page/concepts/:scheme to the list with ?scheme=', () => {
    const tree = {};
    const router = { createUrlTree: jest.fn(() => tree) } as any;
    const guard = new SchemeSegmentRedirectGuard(router);
    const out = guard.canActivate({
      paramMap: convertToParamMap({ scheme: 'meliaf' }),
      queryParams: { q: 'impact' },
    } as any);
    expect(out).toBe(tree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/landing-page/concepts'], {
      queryParams: { q: 'impact', scheme: 'meliaf' },
    });
  });
});

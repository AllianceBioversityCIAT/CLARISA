import { AuthService } from '../../../../../shared/services/auth.service';
import { GcBannerComponent, GC_ADMIN_LINK } from './gc-banner.component';

describe('GcBannerComponent', () => {
  const banner = (auth: Partial<AuthService>) => new GcBannerComponent(auth as AuthService);

  it('offers the admin side only to a live session', () => {
    expect(banner({ localStorageToken: 'jwt', isSessionExpired: () => false } as never).signedIn).toBe(true);
    expect(banner({ localStorageToken: 'jwt', isSessionExpired: () => true } as never).signedIn).toBe(false);
    expect(banner({ localStorageToken: null, isSessionExpired: () => false } as never).signedIn).toBe(false);
  });

  it('hides it when reading the session throws', () => {
    const broken = {
      get localStorageToken(): string {
        throw new Error('storage blocked');
      }
    };
    expect(banner(broken as never).signedIn).toBe(false);
  });

  it('points to the Global Concepts admin', () => {
    expect(banner({} as never).adminLink).toBe(GC_ADMIN_LINK);
  });
});

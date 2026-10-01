import { NEVER, of, throwError } from 'rxjs';
import { AccessAdminApiService, MeAccess } from './access-admin-api.service';
import { PANEL_ACCESS_TIMEOUT_MS, PanelAccessService } from './panel-access.service';
import { AuthService } from '../auth.service';

describe('PanelAccessService', () => {
  const access: MeAccess = { userId: 1, email: 'a@b', roles: [], permissions: ['/api/glossary/admin'], isSuper: false };
  let token: string | null;
  let api: { me: jest.Mock };
  let service: PanelAccessService;

  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    token = 'token-1';
    api = { me: jest.fn(() => of(access)) };
    const auth = {
      get localStorageToken() {
        return token;
      }
    };
    service = new PanelAccessService(api as unknown as AccessAdminApiService, auth as unknown as AuthService);
  });

  afterEach(() => warn.mockRestore());

  it('fetches once per session and reuses the answer', () => {
    service.ensure();
    service.ensure();
    let got: MeAccess | null = null;
    service.resolved().subscribe(value => (got = value));

    expect(api.me).toHaveBeenCalledTimes(1);
    expect(got).toEqual(access);
  });

  it('fetches again when the token changes (a new login)', () => {
    service.ensure();
    token = 'token-2';
    service.ensure();
    expect(api.me).toHaveBeenCalledTimes(2);
  });

  it('forgets the access when the session is gone, without calling the API', () => {
    service.ensure();
    token = null;
    let got: MeAccess | null | undefined;
    service.resolved().subscribe(value => (got = value));

    expect(got).toBeNull();
    expect(service.snapshot.status).toBe('idle');
    expect(api.me).toHaveBeenCalledTimes(1);
  });

  it('reports a failure as error and resolves to null; reload tries again', () => {
    api.me.mockReturnValueOnce(throwError(() => new Error('down')));
    let got: MeAccess | null | undefined;
    service.resolved().subscribe(value => (got = value));
    expect(service.snapshot.status).toBe('error');
    expect(got).toBeNull();

    service.reload();
    expect(service.snapshot.status).toBe('ready');
  });

  it('logs a non-blocking notice when me/access fails', () => {
    api.me.mockReturnValueOnce(throwError(() => new Error('down')));
    service.ensure();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('full panel menu');
  });

  // Every guard and screen calls ensure(): refetching after a failure would make
  // each navigation wait again for an API that just failed.
  it('keeps the failure for the session instead of refetching on every ensure', () => {
    api.me.mockReturnValueOnce(throwError(() => new Error('down')));
    service.ensure();
    service.ensure();
    service.resolved().subscribe();
    expect(api.me).toHaveBeenCalledTimes(1);
    expect(service.snapshot.status).toBe('error');

    token = 'token-2';
    service.ensure();
    expect(api.me).toHaveBeenCalledTimes(2);
  });

  describe('when me/access never answers', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it(`gives up after ${PANEL_ACCESS_TIMEOUT_MS} ms: error state, and resolved() emits null instead of waiting forever`, () => {
      api.me.mockReturnValue(NEVER);
      let got: MeAccess | null | undefined;
      let completed = false;
      service.resolved().subscribe({ next: value => (got = value), complete: () => (completed = true) });

      jest.advanceTimersByTime(PANEL_ACCESS_TIMEOUT_MS - 1);
      expect(got).toBeUndefined();
      expect(service.snapshot.status).toBe('loading');

      jest.advanceTimersByTime(1);
      expect(got).toBeNull();
      expect(completed).toBe(true);
      expect(service.snapshot.status).toBe('error');
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('a resolved() that joins a slow fetch late still resolves within the cap of the fetch', () => {
      api.me.mockReturnValue(NEVER);
      service.ensure();
      jest.advanceTimersByTime(5000);
      let got: MeAccess | null | undefined;
      service.resolved().subscribe(value => (got = value));
      jest.advanceTimersByTime(PANEL_ACCESS_TIMEOUT_MS - 5000);
      expect(got).toBeNull();
      expect(api.me).toHaveBeenCalledTimes(1);
    });
  });
});

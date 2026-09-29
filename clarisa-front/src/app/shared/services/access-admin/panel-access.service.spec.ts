import { of, throwError } from 'rxjs';
import { AccessAdminApiService, MeAccess } from './access-admin-api.service';
import { PanelAccessService } from './panel-access.service';
import { AuthService } from '../auth.service';

describe('PanelAccessService', () => {
  const access: MeAccess = { userId: 1, email: 'a@b', roles: [], permissions: ['/api/glossary/admin'], isSuper: false };
  let token: string | null;
  let api: { me: jest.Mock };
  let service: PanelAccessService;

  beforeEach(() => {
    token = 'token-1';
    api = { me: jest.fn(() => of(access)) };
    const auth = {
      get localStorageToken() {
        return token;
      }
    };
    service = new PanelAccessService(api as unknown as AccessAdminApiService, auth as unknown as AuthService);
  });

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
});

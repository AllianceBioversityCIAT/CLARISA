import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LoginComponent } from './login.component';
import { PanelAccessService } from '../../../shared/services/access-admin/panel-access.service';
import { environment } from 'src/environments/environment';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;

  const LOGIN_URL = `${environment.apiUrl}auth/login`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule],
      declarations: [LoginComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const fill = () => component.loginForm.setValue({ login: 'y.zuniga', password: 'secret' });
  const shown = (): string => (fixture.nativeElement.querySelector('.login-card__error')?.textContent ?? '').trim();

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Lo que reportó Yeck: una contraseña incorrecta no decía absolutamente nada.
  it('says the password is wrong, on screen, when the API answers 401', () => {
    fill();
    component.onSubmit();
    http.expectOne(LOGIN_URL).flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(shown()).toContain('Username or password is incorrect');
    expect(component.signingIn).toBe(false);
  });

  // Y no culpa a la contraseña de lo que no es suyo.
  it('blames the service, not the password, when the request never arrives', () => {
    fill();
    component.onSubmit();
    http.expectOne(LOGIN_URL).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(shown()).toContain('Could not reach the sign-in service');
    expect(shown()).not.toContain('password is incorrect');
  });

  it('names a server failure with its status', () => {
    fill();
    component.onSubmit();
    http.expectOne(LOGIN_URL).flush('boom', { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    expect(shown()).toContain('503');
  });

  // Un error viejo colgado mientras se corrige la contraseña hace creer que el
  // intento nuevo también falló.
  it('clears the message as soon as the form is typed in again', () => {
    fill();
    component.onSubmit();
    http.expectOne(LOGIN_URL).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(shown()).not.toBe('');

    component.loginForm.controls['password'].setValue('another');
    fixture.detectChanges();

    expect(component.menssageValidate).toBe('');
    expect(fixture.nativeElement.querySelector('.login-card__error')).toBeNull();
  });

  it('shows nothing before the first attempt', () => {
    expect(fixture.nativeElement.querySelector('.login-card__error')).toBeNull();
  });

  afterEach(() => {
    http.verify();
  });
});

// El back de CLARISA devuelve 500 —no 401— cuando el usuario existe y la
// contraseña no es la suya (medido contra clarisatest, 16-sep-2026). Es el caso
// más común de todos, así que la pantalla tiene que reconocerlo por el cuerpo.
describe('LoginComponent · el 500 que en realidad es una contraseña mal escrita', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;

  const LOGIN_URL = `${environment.apiUrl}auth/login`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule],
      declarations: [LoginComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.loginForm.setValue({ login: 'y.zuniga', password: 'nope' });
  });

  it('reads the body, not just the status, and blames the password', () => {
    component.onSubmit();
    http.expectOne(LOGIN_URL).flush(
      {
        response: { name: 'SERVER_NOT_FOUND', description: 'There was an internal server error: Invalid Credentials', httpCode: 500 },
        message: 'Http Exception',
        status: 500
      },
      { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.detectChanges();

    const shown = (fixture.nativeElement.querySelector('.login-card__error')?.textContent ?? '').trim();
    expect(shown).toContain('Username or password is incorrect');
    expect(shown).not.toContain('500');
  });

  it('still blames the service for a 500 that is not about credentials', () => {
    component.onSubmit();
    http.expectOne(LOGIN_URL).flush({ message: 'database is down' }, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const shown = (fixture.nativeElement.querySelector('.login-card__error')?.textContent ?? '').trim();
    expect(shown).toContain('500');
    expect(shown).not.toContain('password is incorrect');
  });

  afterEach(() => http.verify());
});

/**
 * La sesión que vence.
 *
 * 🛑 Lo que hacía la aplicación: al caducar el token, el guard y el interceptor
 * llevaban a la persona a `landing-page/login` **sin decir nada**, a media tarea
 * y con el formulario vacío. Se lee como una expulsión, no como un tiempo
 * agotado. El motivo viaja ahora en la URL, y esta pantalla es quien lo cuenta.
 */
describe('LoginComponent · la sesión que venció', () => {
  const LOGIN_URL = `${environment.apiUrl}auth/login`;

  /** Monta la pantalla como si se hubiera llegado con esos query params. */
  const screenWith = async (params: Record<string, string>) => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule],
      declarations: [LoginComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params) } }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  };

  const notice = (fixture: ComponentFixture<LoginComponent>): string =>
    (fixture.nativeElement.querySelector('.login-card__notice')?.textContent ?? '').trim();

  it('dice por qué se está aquí cuando la sesión venció', async () => {
    const fixture = await screenWith({ reason: 'session-expired' });

    expect(notice(fixture)).toContain('Your session expired');
    // El aviso informa, no alarma: no puede ocupar el sitio del error del intento.
    expect(fixture.nativeElement.querySelector('.login-card__error')).toBeNull();
  });

  // La otra mitad, y la que impide «avisar siempre»: quien entra por su pie no
  // ha perdido ninguna sesión, y decirle que sí lo confunde.
  it('no dice nada a quien entra normalmente', async () => {
    const fixture = await screenWith({});

    expect(fixture.nativeElement.querySelector('.login-card__notice')).toBeNull();
  });

  it('no dice nada con un motivo que no es el de la expiración', async () => {
    const fixture = await screenWith({ reason: 'logout' });

    expect(fixture.nativeElement.querySelector('.login-card__notice')).toBeNull();
  });

  // Al reintentar, la noticia es el intento nuevo: dejar colgado el aviso de la
  // sesión anterior mientras aparece un error hace leer dos cosas a la vez.
  it('se retira en cuanto se vuelve a intentar entrar', async () => {
    const fixture = await screenWith({ reason: 'session-expired' });
    const http = TestBed.inject(HttpTestingController);
    const component = fixture.componentInstance;

    component.loginForm.setValue({ login: 'y.zuniga', password: 'secret' });
    component.onSubmit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.login-card__notice')).toBeNull();

    http.expectOne(LOGIN_URL).flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.login-card__error').textContent).toContain('Username or password is incorrect');
    expect(fixture.nativeElement.querySelector('.login-card__notice')).toBeNull();
    http.verify();
  });

  it('el aviso lleva el tono del sitio, no el del error', async () => {
    const fixture = await screenWith({ reason: 'session-expired' });
    const element: HTMLElement = fixture.nativeElement.querySelector('.login-card__notice');

    // Se anuncia como información, no como alerta: no ha fallado nada.
    expect(element.getAttribute('role')).toBe('status');
    // El icono es decorativo; el texto ya lo dice todo.
    expect(element.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
  });
});

/**
 * Where a sign-in lands. Super admins keep landing on Institution requests;
 * one section → that section; several → Institution requests when they open
 * it, else the panel home; none → the public home (the panel has nothing).
 */
describe('LoginComponent · dónde aterriza al entrar', () => {
  const LOGIN_URL = `${environment.apiUrl}auth/login`;

  const signIn = async (access: unknown) => {
    TestBed.resetTestingModule();
    const resolved = jest.fn(() => (access === NEVER ? NEVER : of(access)));
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule],
      declarations: [LoginComponent],
      providers: [{ provide: PanelAccessService, useValue: { resolved } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.loginForm.setValue({ login: 'y.zuniga', password: 'secret' });
    fixture.componentInstance.onSubmit();
    http.expectOne(LOGIN_URL).flush({ access_token: 'token', user: { id: 1 } });
    http.verify();
    return { navigate, resolved };
  };

  const who = (permissions: string[], isSuper = false) => ({ userId: 1, email: 'a@b', roles: [], permissions, isSuper });

  it('a super admin lands on partner-request, as before', async () => {
    const { navigate } = await signIn(who([], true));
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/partner-request');
  });

  it('someone who can answer requests lands on partner-request, as before', async () => {
    const { navigate } = await signIn(who(['/api/partner-requests/respond']));
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/partner-request');
  });

  it('an institution requester (create only) lands on partner-request, the one section they open', async () => {
    const { navigate } = await signIn(who(['/api/partner-requests/create']));
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/partner-request');
  });

  it('a member whose roles open exactly one protected section lands in it (Concepts-only → Concepts)', async () => {
    const { navigate } = await signIn(who(['/api/meliaf-taxonomy/admin']));
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/concepts-admin');
  });

  it('a single protected tab lands on that tab', async () => {
    const { navigate } = await signIn(who(['/api/mises/create']));
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/microservices-admin?section=mises');
  });

  it('two sections including Institution requests land on partner-request, as before', async () => {
    const { navigate } = await signIn(who(['/api/glossary/admin', '/api/partner-requests/respond']));
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/partner-request');
  });

  it('two sections without Institution requests land on the panel home', async () => {
    const { navigate } = await signIn(who(['/api/glossary/admin', '/api/institutions/lifecycle/']));
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage');
  });

  it('someone without any role lands on the public home: the panel has nothing for them', async () => {
    const { navigate } = await signIn(who([]));
    expect(navigate).toHaveBeenCalledWith('/landing-page/home');
  });

  it('when the access cannot be read, nothing changes: partner-request', async () => {
    const { navigate } = await signIn(null);
    expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/partner-request');
  });

  it('when the access never answers, the old landing is used after the cap', async () => {
    jest.useFakeTimers();
    try {
      const { navigate } = await signIn(NEVER);
      expect(navigate).not.toHaveBeenCalled();
      jest.advanceTimersByTime(LoginComponent.ACCESS_WAIT_MS);
      expect(navigate).toHaveBeenCalledWith('/clarisa-panel/manage/partner-request');
    } finally {
      jest.useRealTimers();
    }
  });
});

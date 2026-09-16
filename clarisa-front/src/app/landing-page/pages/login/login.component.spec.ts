import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LoginComponent } from './login.component';
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { NavigationBarComponent } from './navigation-bar.component';

describe('NavigationBarComponent', () => {
  let component: NavigationBarComponent;
  let fixture: ComponentFixture<NavigationBarComponent>;

  beforeEach(async () => {
    // Sin sesión guardada la barra muestra «Sign in», que es lo que estos casos
    // comprueban. Un token dejado por otro test la pondría en modo cuenta.
    localStorage.clear();

    await TestBed.configureTestingModule({
      // `HttpClientTestingModule` porque la barra ahora inyecta `AuthService`
      // para saber si hay sesión, y ese servicio pide `HttpClient`.
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [NavigationBarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Al login solo se llegaba escribiendo la URL o siendo expulsado por el guard
  // desde "Institution Request" — la vía enredada que reportó Héctor en el
  // ticket 161964. La barra tiene que ofrecer la puerta.
  describe('el acceso al panel', () => {
    const boton = () => fixture.nativeElement.querySelector('.nav-signin');

    it('ofrece un enlace visible que lleva al login', () => {
      expect(boton()).toBeTruthy();
      expect(boton().textContent.trim()).toBe('Sign in');
      expect(boton().getAttribute('href')).toBe('/landing-page/login');
    });

    // Bootstrap 3 fuerza `display: block !important` sobre `.navbar-collapse`
    // a partir de 768px: cualquier cosa metida ahí dentro se cae a una segunda
    // línea. El acceso va como hijo directo de la barra.
    it('no vive dentro del menú colapsable', () => {
      expect(boton().closest('.navbar-collapse')).toBeNull();
      // El rediseño movió el envoltorio de `.navbar` a `.cl-bar`; lo que la
      // prueba garantiza sigue siendo lo mismo, que el acceso es hijo directo
      // de la barra y no del menú que Bootstrap colapsa.
      expect(boton().parentElement.classList.contains('cl-bar')).toBe(true);
    });
  });
});

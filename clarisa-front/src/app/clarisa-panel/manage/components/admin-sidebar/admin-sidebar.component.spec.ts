import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AdminSidebarComponent } from './admin-sidebar.component';
import { AuthService } from '../../../../shared/services/auth.service';

describe('AdminSidebarComponent', () => {
  let component: AdminSidebarComponent;
  let fixture: ComponentFixture<AdminSidebarComponent>;
  let auth: { localStorageToken: string | null; localStorageUser: unknown; isSessionExpired: jest.Mock };

  beforeEach(async () => {
    auth = {
      localStorageToken: 'a.token',
      localStorageUser: { name: 'Yecksin Zuñiga', email: 'y.zuniga@cgiar.org' },
      isSessionExpired: jest.fn().mockReturnValue(false)
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FormsModule],
      declarations: [AdminSidebarComponent],
      providers: [{ provide: AuthService, useValue: auth }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const labels = () => Array.from(fixture.nativeElement.querySelectorAll('.admin-sidebar__list a')).map(a => (a as HTMLElement).textContent?.trim());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists every section, grouped, when nothing is typed', () => {
    expect(component.groups.map(group => group.title)).toEqual(['Manage', 'Access', 'System']);
    expect(labels()).toContain('Glossary');
    expect(labels()?.length).toBe(6);
  });

  // El buscador es del menú: filtra en memoria y no llama a nadie.
  it('filters the menu by what is typed, and drops the groups left empty', () => {
    component.query = 'insti';
    fixture.detectChanges();

    expect(labels()).toEqual(['Institution requests', 'Institution lifecycle']);
    expect(component.groups.map(group => group.title)).toEqual(['Manage']);
    expect(component.isEmpty).toBe(false);
  });

  it('says so when nothing matches, instead of leaving the column blank', () => {
    component.query = 'zzz';
    fixture.detectChanges();

    expect(component.isEmpty).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No section matches');
  });

  it('collapses a group and opens it again', () => {
    const manage = component.groups[0];

    component.toggle(manage);
    fixture.detectChanges();
    expect(component.isCollapsed(manage)).toBe(true);
    expect(labels()).not.toContain('Glossary');

    component.toggle(manage);
    fixture.detectChanges();
    expect(labels()).toContain('Glossary');
  });

  // Esconder una coincidencia dentro de un grupo plegado es responder «no hay
  // nada» a una pregunta que sí tenía respuesta.
  it('shows a match even if its group was collapsed', () => {
    component.toggle(component.groups[0]);
    component.query = 'glossary';
    fixture.detectChanges();

    expect(labels()).toEqual(['Glossary']);
  });

  it('names the account at the foot', () => {
    expect(component.displayName).toBe('Yecksin Zuñiga');
    expect(component.email).toBe('y.zuniga@cgiar.org');
    expect(component.initials).toBe('YZ');
    expect(fixture.nativeElement.querySelector('.admin-sidebar__account')).not.toBeNull();
  });

  it('draws no account when the session is not usable', () => {
    auth.isSessionExpired.mockReturnValue(true);
    fixture.detectChanges();

    expect(component.user).toBeNull();
    expect(fixture.nativeElement.querySelector('.admin-sidebar__account')).toBeNull();
  });

  it('survives a corrupt stored user', () => {
    Object.defineProperty(auth, 'localStorageUser', {
      get() {
        throw new Error('corrupt');
      }
    });

    expect(() => component.user).not.toThrow();
    expect(component.user).toBeNull();
  });
});

describe('AdminSidebarComponent · atajo de teclado', () => {
  let component: AdminSidebarComponent;
  let fixture: ComponentFixture<AdminSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FormsModule],
      declarations: [AdminSidebarComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { localStorageToken: null, localStorageUser: null, isSessionExpired: () => true }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input[name="admin-search"]');

  // La tecla se dibuja en la caja, así que tiene que hacer algo: una tecla
  // pintada que no responde es peor que no pintarla.
  it('takes the focus to the search box on ⌘K and on Ctrl+K', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    expect(document.activeElement).toBe(input());

    input().blur();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', ctrlKey: true, bubbles: true }));
    expect(document.activeElement).toBe(input());
  });

  it('leaves every other key alone', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    expect(document.activeElement).not.toBe(input());
  });

  it('empties the box and gives it back the focus when cleared', () => {
    component.query = 'glossary';
    fixture.detectChanges();

    component.clear();
    expect(component.query).toBe('');
    expect(document.activeElement).toBe(input());
  });
});

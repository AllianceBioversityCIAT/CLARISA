import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
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
      imports: [
        HttpClientTestingModule,
        // Con rutas de verdad: el cajón se cierra al aterrizar una navegación, y
        // sin una ruta que resolver no hay `NavigationEnd` que escuchar.
        RouterTestingModule.withRoutes([
          { path: 'clarisa-panel/manage/glossary-admin', component: AdminSidebarComponent }
        ]),
        FormsModule
      ],
      declarations: [AdminSidebarComponent],
      providers: [{ provide: AuthService, useValue: auth }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Direct child combinator: un link con `children` mete su propia `<ul>` de
  // pestañas dentro del mismo `<li>`, y esa `<ul>` cuelga de `.admin-sidebar__list`
  // igual que las demás — sin el `>` esas pestañas se contarían aquí también.
  const labels = () => Array.from(fixture.nativeElement.querySelectorAll('.admin-sidebar__list > li > a')).map(a => (a as HTMLElement).textContent?.trim());

  const subLabels = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.admin-sidebar__sublist a .admin-sidebar__sublink-label')).map(el =>
      (el as HTMLElement).textContent?.trim()
    );

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists every section, grouped, when nothing is typed', () => {
    expect(component.groups.map(group => group.title)).toEqual(['Manage', 'Access', 'System']);
    expect(labels()).toContain('Glossary');
    // 5 links directos: los 6 de siempre menos «Microservices & API keys», que
    // ahora es un toggle (botón) en vez de un link.
    expect(labels()?.length).toBe(5);
  });

  // La columna blanca que esto reemplazó mostraba sus tres pestañas siempre a
  // la vista, así que el desplegable nace abierto, no colapsado.
  it('shows the Microservices sub-menu open by default, with its three tabs', () => {
    expect(subLabels()).toEqual(['API Keys', 'Usage & Analytics', 'MIS Registry']);

    const toggle = fixture.nativeElement.querySelector('.admin-sidebar__list-toggle') as HTMLElement;
    expect(toggle.textContent).toContain('Microservices & API keys');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('collapses and reopens the Microservices sub-menu', () => {
    const microservices = component.groups
      .find(group => group.title === 'System')
      ?.links.find(link => link.children);

    component.toggleLink(microservices!);
    fixture.detectChanges();
    expect(component.isLinkCollapsed(microservices!)).toBe(true);
    expect(subLabels()).toEqual([]);

    component.toggleLink(microservices!);
    fixture.detectChanges();
    expect(component.isLinkCollapsed(microservices!)).toBe(false);
    expect(subLabels()).toEqual(['API Keys', 'Usage & Analytics', 'MIS Registry']);
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
      imports: [
        HttpClientTestingModule,
        // Con rutas de verdad: el cajón se cierra al aterrizar una navegación, y
        // sin una ruta que resolver no hay `NavigationEnd` que escuchar.
        RouterTestingModule.withRoutes([
          { path: 'clarisa-panel/manage/glossary-admin', component: AdminSidebarComponent }
        ]),
        FormsModule
      ],
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

  // -------------------------------------------------------------------------
  // El cajón del teléfono
  //
  // Bajo 900px la columna se abre encima del contenido. Lo que se fija aquí es
  // el comportamiento, no el ancho: que se abra y se cierre, que cerrar sea
  // posible por las tres vías que la gente intenta (el botón, el velo, Escape),
  // que navegar la cierre —si no, la pantalla a la que se acaba de entrar queda
  // tapada por el menú que la abrió— y que el candado del scroll de <body> no
  // sobreviva al componente.
  // -------------------------------------------------------------------------
  describe('AdminSidebarComponent · cajón del teléfono', () => {
    it('starts closed, with the page free to scroll', () => {
      expect(component.drawerOpen).toBe(false);
      expect(document.body.classList.contains('admin-drawer-open')).toBe(false);
    });

    it('opens and closes from the burger, locking the page behind it', () => {
      component.toggleDrawer();
      expect(component.drawerOpen).toBe(true);
      expect(document.body.classList.contains('admin-drawer-open')).toBe(true);

      component.toggleDrawer();
      expect(component.drawerOpen).toBe(false);
      expect(document.body.classList.contains('admin-drawer-open')).toBe(false);
    });

    it('closes on Escape, and leaves Escape alone when it is already closed', () => {
      component.openDrawer();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(component.drawerOpen).toBe(false);

      // Cerrado, Escape no es suyo: lo necesita el diálogo o el desplegable que
      // esté abierto encima.
      component.query = 'glossary';
      fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(component.drawerOpen).toBe(false);
    });

    it('closes itself when a navigation lands, and names the section it landed on', fakeAsync(() => {
      const router = TestBed.inject(Router);
      component.openDrawer();

      router.navigateByUrl('/clarisa-panel/manage/glossary-admin');
      tick();

      expect(component.drawerOpen).toBe(false);
      expect(document.body.classList.contains('admin-drawer-open')).toBe(false);
      expect(component.sectionLabel).toBe('Glossary');
    }));

    it('releases the page when the panel is left with the drawer open', () => {
      component.openDrawer();
      expect(document.body.classList.contains('admin-drawer-open')).toBe(true);

      fixture.destroy();
      expect(document.body.classList.contains('admin-drawer-open')).toBe(false);
    });

    it('draws the burger and titles the bar with the current section', () => {
      component.sectionLabel = 'Institution lifecycle';
      fixture.detectChanges();

      const burger = fixture.nativeElement.querySelector('.admin-topbar__burger');
      expect(burger).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.admin-topbar__where').textContent.trim()).toBe('Institution lifecycle');

      // Sin sección reconocida la barra no se queda muda.
      component.sectionLabel = null;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.admin-topbar__where').textContent.trim()).toBe('Administration');
    });

    it('only draws the scrim while the drawer is open', () => {
      expect(fixture.nativeElement.querySelector('.admin-scrim')).toBeNull();

      component.openDrawer();
      fixture.detectChanges();
      fixture.nativeElement.querySelector('.admin-scrim').click();
      fixture.detectChanges();

      expect(component.drawerOpen).toBe(false);
      expect(fixture.nativeElement.querySelector('.admin-scrim')).toBeNull();
    });
  });
});

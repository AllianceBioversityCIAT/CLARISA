import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';

import { HorizontalMenuComponent } from './horizontal-menu.component';

@Component({ template: '' })
class BlankComponent {}

describe('HorizontalMenuComponent', () => {
  let component: HorizontalMenuComponent;
  let fixture: ComponentFixture<HorizontalMenuComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'clarisa-panel/manage/glossary-admin', component: BlankComponent },
          { path: 'clarisa-panel/manage/manage-user', component: BlankComponent }
        ])
      ],
      declarations: [HorizontalMenuComponent, BlankComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(HorizontalMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Lo que Yeck pidió el 16-sep-2026: el menú del sitio no se repite dentro del
  // panel. Se comprueba por el texto y no por una clase, porque volver a meter
  // los enlaces sería precisamente escribir estas palabras otra vez.
  it('carries none of the public navigation', () => {
    const bar = text();

    ['Home', 'Dashboards', 'Services', 'Help'].forEach(label => {
      expect(bar).not.toContain(label);
    });
  });

  // La salida vive arriba, en la barra, y no al pie del sidebar.
  it('offers the way back to the site, pointing at the public home', () => {
    const back: HTMLAnchorElement | null = fixture.nativeElement.querySelector('.cl-back');

    expect(back).not.toBeNull();
    expect(back?.textContent).toContain('Back to the site');
    expect(back?.getAttribute('href')).toBe('/landing-page/home');
  });

  it('titles the section from the current route, and falls back outside the panel', async () => {
    expect(component.sectionLabel).toBe('Administration');

    await router.navigateByUrl('/clarisa-panel/manage/glossary-admin');
    fixture.detectChanges();
    expect(component.sectionLabel).toBe('Glossary');

    await router.navigateByUrl('/clarisa-panel/manage/manage-user');
    fixture.detectChanges();
    expect(component.sectionLabel).toBe('Users');
  });

  it('stops listening to the router once it is gone', () => {
    fixture.destroy();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

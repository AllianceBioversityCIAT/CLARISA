import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * 🛑 La regresión del 16-sep-2026: en el teléfono el carril medía menos que la
   * pantalla, el recorrido salía negativo y `update()` abandonaba en su primera
   * línea. Con eso muerto no avanzaba el vídeo, `step` no pasaba de 0 y —lo peor—
   * el texto del hero nunca se apagaba, así que quedaba pintado encima de las
   * seis secciones de la página.
   *
   * La prueba fija lo único que importa de aquel fallo: un carril sin recorrido
   * NO puede impedir que se calcule el relevo.
   */
  it('sigue calculando el relevo aunque el carril no tenga recorrido', () => {
    const rail = { offsetHeight: 0, getBoundingClientRect: () => ({ top: -500 }) } as unknown as HTMLElement;
    // El contenido ya asomó por arriba: el hero tiene que apagarse.
    const story = { offsetHeight: 4000, getBoundingClientRect: () => ({ top: -100 }) } as unknown as HTMLElement;

    const stage = { offsetHeight: 664 } as unknown as HTMLElement;

    component.rail = { nativeElement: rail };
    component.story = { nativeElement: story };
    component.stage = { nativeElement: stage };

    component['update']();

    expect(component.heroOff).toBe(true);
    expect(component.underground).toBe(true);
    // Sin recorrido, el crecimiento se da por terminado en vez de por empezar.
    expect(component.step).toBe(2);
  });
});

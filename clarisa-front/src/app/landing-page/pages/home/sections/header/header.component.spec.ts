import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { HeaderComponent } from './header.component';
import { environment } from 'src/environments/environment';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
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

  /**
   * 🛑 Las seis cifras de la home estuvieron escritas a mano hasta septiembre de
   * 2026 y envejecieron a la vista de todos: la página decía 32 iniciativas
   * cuando ya había 43. Estas pruebas fijan que ahora salgan del API.
   */
  describe('las cifras vienen del API', () => {
    const payload = {
      institutions: 10630,
      projects: 1210,
      workPackages: 344,
      countries: 248,
      initiatives: 43,
      controlLists: 41,
      generatedAt: '2026-09-17T00:00:00.000Z'
    };

    it('pide api/metrics al arrancar', () => {
      const req = http.expectOne(`${environment.apiUrl}api/metrics`);
      expect(req.request.method).toBe('GET');
      req.flush(payload);
    });

    it('reparte cada conteo en su indicador y calcula la escala contra el mayor', () => {
      http.expectOne(`${environment.apiUrl}api/metrics`).flush(payload);

      const porClave = Object.fromEntries(component.indicators.map(i => [i.key, i]));

      expect(porClave['institutions'].value).toBe(10630);
      expect(porClave['initiatives'].value).toBe(43);
      expect(porClave['controlLists'].value).toBe(41);
      // La barra más larga es la del mayor; el resto, proporcional.
      expect(porClave['institutions'].share).toBe(1);
      expect(porClave['projects'].share).toBeCloseTo(1210 / 10630, 5);
      expect(component.metricsState).toBe('ready');
    });

    /**
     * 🛑 Lo que NO puede pasar: que un fallo del API devuelva a la página los
     * números viejos, o un cero. Las etiquetas se quedan —esos catálogos
     * existen— y el número se queda en blanco.
     */
    it('si el API falla no inventa cifras', () => {
      http.expectOne(`${environment.apiUrl}api/metrics`).error(new ProgressEvent('error'));

      expect(component.metricsState).toBe('unavailable');
      expect(component.indicators.every(i => i.value === null)).toBe(true);
      expect(component.indicators.every(i => i.display === null)).toBe(true);
    });

    it('no pinta nada hasta que llega la respuesta', () => {
      expect(component.metricsState).toBe('loading');
      expect(component.indicators.every(i => i.display === null)).toBe(true);
      http.expectOne(`${environment.apiUrl}api/metrics`).flush(payload);
    });
  });
});

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ListInstitutionComponent } from './list-institution.component';

describe('ListInstitutionComponent', () => {
  let component: ListInstitutionComponent;
  let fixture: ComponentFixture<ListInstitutionComponent>;
  let http: HttpTestingController;

  const ENDPOINT = 'https://clarisatest-back.ciat.cgiar.org/api/institutions';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ListInstitutionComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListInstitutionComponent);
    component = fixture.componentInstance;
  });

  const fail = () => http.expectOne(ENDPOINT).error(new ProgressEvent('error'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('paints the catalogue it receives', () => {
    fixture.detectChanges();
    http.expectOne(ENDPOINT).flush([{ code: 1, name: 'One' }]);

    expect(component.informationEndpoint.length).toBe(1);
    expect(component.loading).toBe(false);
    expect(component.failed).toBe(false);
  });

  // La columna «Office location» es una lista de etiquetas, y una lista no se
  // puede comparar: la tabla ordena por esta clave. Sin ella la flecha del
  // encabezado no movería nada, que es el defecto que ya tenía «Institution
  // type» cuando ordenaba por el objeto.
  it('gives each row the first country office in alphabetical order, to sort by', () => {
    fixture.detectChanges();
    http.expectOne(ENDPOINT).flush([
      { code: 1, name: 'Three offices', countryOfficeDTO: [{ isoAlpha2: 'LB' }, { isoAlpha2: 'SY' }, { isoAlpha2: 'EG' }] },
      { code: 2, name: 'Two offices', countryOfficeDTO: [{ isoAlpha2: 'IT' }, { isoAlpha2: 'CO' }] },
      { code: 3, name: 'No office', countryOfficeDTO: [] },
      { code: 4, name: 'Field missing' }
    ]);

    expect(component.informationEndpoint.map((row: any) => row.officeSort)).toEqual(['EG', 'CO', null, null]);
  });

  // El caso que reportó Yeck: la descarga se corta y la pantalla se queda
  // girando para siempre sobre «0 institutions».
  it('stops spinning and says so when the download never arrives', fakeAsync(() => {
    fixture.detectChanges();

    fail();
    tick(1200); // el reintento automático
    fail();
    tick();

    expect(component.loading).toBe(false);
    expect(component.failed).toBe(true);
  }));

  // Un corte puntual no debería costarle nada al usuario.
  it('retries once on its own, and a second attempt that works is enough', fakeAsync(() => {
    fixture.detectChanges();

    fail();
    tick(1200);
    http.expectOne(ENDPOINT).flush([{ code: 7 }]);
    tick();

    expect(component.failed).toBe(false);
    expect(component.loading).toBe(false);
    expect(component.informationEndpoint.length).toBe(1);
  }));

  it('asks again when the button is pressed, and clears the error', fakeAsync(() => {
    fixture.detectChanges();
    fail();
    tick(1200);
    fail();
    tick();
    expect(component.failed).toBe(true);

    component.load();
    expect(component.failed).toBe(false);
    expect(component.loading).toBe(true);

    http.expectOne(ENDPOINT).flush([{ code: 9 }]);
    tick();
    expect(component.informationEndpoint.length).toBe(1);
  }));

  // La causa concreta se enseña en pantalla para no tener que abrir la consola
  // del navegador: es lo que distingue «se cayó la red» de «el servidor dijo que
  // no» y de «no contestó nunca».
  it('names what went wrong', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(ENDPOINT).error(new ProgressEvent('error'), { status: 0 });
    tick(1200);
    http.expectOne(ENDPOINT).error(new ProgressEvent('error'), { status: 0 });
    tick();
    expect(component.reason).toContain('never reached the server');

    // El 503 también se reintenta una vez antes de rendirse, como cualquier otro fallo.
    component.load();
    http.expectOne(ENDPOINT).flush('nope', { status: 503, statusText: 'Service Unavailable' });
    tick(1200);
    http.expectOne(ENDPOINT).flush('nope', { status: 503, statusText: 'Service Unavailable' });
    tick();
    expect(component.reason).toContain('503');
  }));

  // Una petición que ni responde ni falla volvía a dejar el girador eterno por
  // otro camino; a los 90 segundos se da por perdida.
  it('gives up on a request that never answers', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(ENDPOINT);

    tick(90000);
    tick(1200);
    http.expectOne(ENDPOINT);
    tick(90000);
    tick();

    expect(component.loading).toBe(false);
    expect(component.failed).toBe(true);
    expect(component.reason).toContain('90 seconds');
  }));

  it('drops the request when the screen goes away', () => {
    fixture.detectChanges();
    const open = http.expectOne(ENDPOINT);

    fixture.destroy();
    expect(open.cancelled).toBe(true);
  });

  afterEach(() => {
    http.verify();
  });
});

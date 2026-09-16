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

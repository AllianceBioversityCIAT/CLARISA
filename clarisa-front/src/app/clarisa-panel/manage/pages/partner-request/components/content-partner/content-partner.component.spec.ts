import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ContentPartnerComponent } from './content-partner.component';

describe('ContentPartnerComponent', () => {
  let component: ContentPartnerComponent;
  let fixture: ComponentFixture<ContentPartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ContentPartnerComponent],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ContentPartnerComponent, {
        set: { template: '<div></div>' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ContentPartnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * El permiso decidía qué pestaña se pintaba desde un `*ngIf` en la plantilla.
   * Al pasarlo a `visibleTabs` la regla se queda sin la vigilancia del
   * compilador: si alguien cambia la lista, nadie se entera hasta que un usuario
   * ve una sección que no le toca.
   */
  describe('visibleTabs', () => {
    it('only offers the list when the session carries no permissions', () => {
      component.miStorage = null;

      expect(component.visibleTabs.map((tab) => tab.id)).toEqual(['list']);
    });

    it('needs both update and respond before offering the pending requests', () => {
      component.miStorage = { permissions: ['/api/partner-requests/update'] };

      expect(component.visibleTabs.map((tab) => tab.id)).toEqual(['list']);
    });

    it('offers every section to a full administrator', () => {
      component.miStorage = {
        permissions: [
          '/api/partner-requests/create',
          '/api/partner-requests/update',
          '/api/partner-requests/respond',
          '/api/partner-requests/create-bulk'
        ]
      };

      expect(component.visibleTabs.map((tab) => tab.id)).toEqual(['list', 'new', 'pending', 'bulk']);
    });
  });

  describe('pendingCount', () => {
    it('is zero while the request is still in flight', () => {
      expect(component.pendingCount).toBe(0);
    });

    it('counts the requests waiting for review', () => {
      component.informationParnertRequest = [{}, {}, {}];

      expect(component.pendingCount).toBe(3);
    });
  });
});

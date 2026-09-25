import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { convertToParamMap, ParamMap } from '@angular/router';
import { MicroservicesAdminComponent, SECTION_TABS } from './microservices-admin.component';

/**
 * La pestaña vive en `?section=`: el shell la lee, corrige un valor viejo o
 * ausente reescribiendo la URL, y escribe el parámetro cuando se pulsa una
 * pestaña del riel.
 */
describe('MicroservicesAdminComponent', () => {
  let fixture: ComponentFixture<MicroservicesAdminComponent>;
  let component: MicroservicesAdminComponent;
  let queryParamMap: BehaviorSubject<ParamMap>;
  const router = { navigate: jest.fn() };

  const build = async (params: Record<string, string>) => {
    queryParamMap = new BehaviorSubject(convertToParamMap(params));
    router.navigate.mockClear();
    await TestBed.configureTestingModule({
      declarations: [MicroservicesAdminComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap.asObservable() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(MicroservicesAdminComponent, { set: { template: '<div></div>' } })
      .compileComponents();
    fixture = TestBed.createComponent(MicroservicesAdminComponent);
    component = fixture.componentInstance;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('lists the three sections in flow order: overview, MIS registry, API keys', () => {
    expect(SECTION_TABS.map(tab => tab.id)).toEqual(['overview', 'mises', 'api-keys']);
  });

  it('opens on Overview and writes it to the URL when the parameter is missing', async () => {
    await build({});
    expect(component.activeSection).toBe('overview');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { section: 'overview' }, replaceUrl: true }));
  });

  it('honours a valid section without touching the URL', async () => {
    await build({ section: 'mises' });
    expect(component.activeSection).toBe('mises');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('maps the old «usage» links onto Overview', async () => {
    await build({ section: 'usage' });
    expect(component.activeSection).toBe('overview');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { section: 'overview' } }));
  });

  it('switches by writing the parameter, keeping the rest of the query', async () => {
    await build({ section: 'overview' });
    component.setSection('api-keys');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { section: 'api-keys' }, queryParamsHandling: 'merge' }));

    router.navigate.mockClear();
    component.setSection('overview');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

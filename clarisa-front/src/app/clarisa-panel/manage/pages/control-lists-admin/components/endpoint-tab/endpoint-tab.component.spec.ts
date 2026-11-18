import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { EndpointTabComponent } from './endpoint-tab.component';

const f = (code: string, type: string, over: object = {}) => ({
  code,
  label: code,
  type,
  type_label: type,
  position: 1,
  status: 'published',
  is_required: 0,
  is_unique: 0,
  is_indexed: 0,
  ...over
});

describe('EndpointTabComponent', () => {
  const api = { publicUrl: (code: string) => `https://api/api/control-lists/${code}`, publicRead: jest.fn() };

  function create(detail: object): EndpointTabComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [EndpointTabComponent],
      providers: [{ provide: ControlListsApiService, useValue: api }],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(EndpointTabComponent, { set: { template: '<div></div>' } });
    const c = TestBed.createComponent(EndpointTabComponent).componentInstance;
    c.detail = detail as never;
    c.ngOnChanges({ detail: new SimpleChange(undefined, detail, true) });
    return c;
  }

  beforeEach(() => jest.clearAllMocks());

  it('does not call the public address for a draft', () => {
    const c = create({ code: 'crops', status: 'draft', fields: [] });
    expect(api.publicRead).not.toHaveBeenCalled();
    expect(c.address).toBe('https://api/api/control-lists/crops');
  });

  it('lists a variant per filterable field and per relation, and the implicit fields', () => {
    api.publicRead.mockReturnValue(of({ status: 200, body: [] }));
    const c = create({
      code: 'varieties',
      status: 'published',
      fields: [f('name', 'text'), f('category', 'text', { is_indexed: 1 }), f('crop', 'relation', { relation_code: 'crops', relation_name: 'Crops' })]
    });
    const urls = c.variants.map(v => v.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://api/api/control-lists/varieties/get/{id}',
        'https://api/api/control-lists/varieties?show=all',
        'https://api/api/control-lists/varieties?category=<value>',
        'https://api/api/control-lists/varieties?crop=<value>',
        'https://api/api/control-lists/varieties?expand=crop'
      ])
    );
    expect(urls.some(u => u.includes('?name='))).toBe(false);
    expect(c.rows.map(r => r.code)).toEqual(['id', 'name', 'category', 'crop', 'is_active']);
    expect(c.rows.find(r => r.code === 'crop')?.note).toContain('?expand=crop');
  });

  it('shows the first 3 records and says how many there are', () => {
    api.publicRead.mockReturnValue(of({ status: 200, body: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }));
    const c = create({ code: 'crops', status: 'published', fields: [] });
    expect(c.exampleStatus).toBe(200);
    expect(JSON.parse(c.exampleJson as string)).toHaveLength(3);
    expect(c.exampleNote).toBe('Showing the first 3 of 4 records.');
  });

  it('handles an empty list and an error status', () => {
    api.publicRead.mockReturnValueOnce(of({ status: 200, body: [] }));
    const c = create({ code: 'crops', status: 'published', fields: [] });
    expect(c.exampleJson).toBe('[]');
    expect(c.exampleNote).toBe('The list has no active records yet.');

    api.publicRead.mockReturnValueOnce(throwError(() => ({ status: 404 })));
    c.refresh();
    expect(c.exampleError).toBe('The public address answered 404.');
    api.publicRead.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    c.refresh();
    expect(c.exampleError).toBe('The public address could not be reached.');
  });
});

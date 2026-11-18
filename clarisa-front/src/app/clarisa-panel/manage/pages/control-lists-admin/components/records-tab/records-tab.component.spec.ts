import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { RecordsTabComponent } from './records-tab.component';

const f = (code: string, type: string, over: object = {}) => ({
  id: code.length,
  code,
  label: code,
  type,
  position: 1,
  status: 'published',
  is_required: 0,
  ...over
});

describe('RecordsTabComponent', () => {
  const api = { records: jest.fn() };

  function create(detail: object): RecordsTabComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [RecordsTabComponent],
      providers: [{ provide: ControlListsApiService, useValue: api }],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(RecordsTabComponent, { set: { template: '<div></div>' } });
    const c = TestBed.createComponent(RecordsTabComponent).componentInstance;
    c.detail = detail as never;
    c.ngOnChanges({ detail: new SimpleChange(undefined, detail, true) });
    return c;
  }

  const published = (fields: object[]) => ({ code: 'varieties', status: 'published', fields });

  beforeEach(() => jest.clearAllMocks());

  it('does not read anything for a draft list', () => {
    const c = create({ code: 'varieties', status: 'draft', fields: [f('name', 'text', { status: 'draft' })] });
    expect(api.records).not.toHaveBeenCalled();
    expect(c.published).toBe(false);
    expect(c.loaded).toBe(true);
  });

  it('shows active records by default, filters, and searches the visible values', () => {
    api.records.mockReturnValue(
      of([
        { id: 1, name: 'Maize', is_active: true },
        { id: 2, name: 'Rice', is_active: false },
        { id: 3, name: 'Beans', is_active: true }
      ])
    );
    const c = create(published([f('name', 'text')]));
    expect(c.rows.map(r => r.id)).toEqual([1, 3]);
    expect(c.counts).toEqual({ active: 2, inactive: 1, all: 3 });
    c.setFilter('inactive');
    expect(c.rows.map(r => r.id)).toEqual([2]);
    c.setFilter('all');
    c.search = 'bea';
    c.recompute();
    expect(c.rows.map(r => r.id)).toEqual([3]);
  });

  it('shows the label of a related record, #id when it cannot be resolved, and Yes / No / — for booleans', () => {
    api.records.mockImplementation((code: string) =>
      code === 'crops'
        ? of([{ id: 5, name: 'Maize', is_active: true }])
        : of([{ id: 1, crop: 5, other: 9, staple: false, size: 0, note: null, is_active: true }])
    );
    const fields = [
      f('crop', 'relation', { relation_code: 'crops' }),
      f('other', 'relation', { relation_code: 'crops' }),
      f('staple', 'boolean'),
      f('size', 'integer'),
      f('note', 'text')
    ];
    const c = create(published(fields));
    const row = c.rows[0];
    expect(c.display(c.fields[0], row)).toBe('Maize');
    expect(c.display(c.fields[1], row)).toBe('#9');
    expect(c.display(c.fields[2], row)).toBe('No');
    expect(c.display(c.fields[3], row)).toBe('0');
    expect(c.display(c.fields[4], row)).toBe('—');
  });

  it('keeps going when a related list cannot be read (null), and shows #id', () => {
    api.records.mockImplementation((code: string) =>
      code === 'crops' ? throwError(() => ({ status: 500 })) : of([{ id: 1, crop: 5, is_active: true }])
    );
    const c = create(published([f('crop', 'relation', { relation_code: 'crops' })]));
    expect(c.related['crops']).toBeNull();
    expect(c.display(c.fields[0], c.rows[0])).toBe('#5');
    expect(c.error).toBeNull();
  });

  it('shows the back message when the records cannot be read, and recovers on retry', () => {
    api.records.mockReturnValueOnce(throwError(() => ({ status: 403, error: { message: 'Not your list.' } })));
    const c = create(published([f('name', 'text')]));
    expect(c.error).toBe('Not your list.');
    api.records.mockReturnValue(of([]));
    c.load();
    expect(c.error).toBeNull();
    expect(c.records).toEqual([]);
  });

  it('reads again only when the table itself changed', () => {
    api.records.mockReturnValue(of([]));
    const c = create(published([f('name', 'text')]));
    expect(api.records).toHaveBeenCalledTimes(1);
    const same = published([f('name', 'text')]);
    c.detail = same as never;
    c.ngOnChanges({ detail: new SimpleChange(c.detail, same, false) });
    expect(api.records).toHaveBeenCalledTimes(1);
    const withField = published([f('name', 'text'), f('size', 'integer')]);
    const before = c.detail;
    c.detail = withField as never;
    c.ngOnChanges({ detail: new SimpleChange(before, withField, false) });
    expect(api.records).toHaveBeenCalledTimes(2);
  });
});

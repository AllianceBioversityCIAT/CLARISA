import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ControlListsApiService } from '../services/control-lists-api.service';
import { ListsScreenComponent } from './lists-screen.component';

const row = (id: number, over: object = {}) => ({
  id,
  code: `l${id}`,
  name: `List ${id}`,
  owner_role_id: 1,
  status: 'draft',
  updated_at: '2026-11-18',
  ...over
});
const detail = (id: number, fields: object[], rows = 0) => ({ ...row(id), fields, rows, pending_changes: 0 });

describe('ListsScreenComponent', () => {
  const api = { lists: jest.fn(), owners: jest.fn(), list: jest.fn(), publicUrl: jest.fn() };
  const router = { navigate: jest.fn() };

  function create(): ListsScreenComponent {
    TestBed.configureTestingModule({
      declarations: [ListsScreenComponent],
      providers: [
        { provide: ControlListsApiService, useValue: api },
        { provide: Router, useValue: router }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(ListsScreenComponent, { set: { template: '<div></div>' } });
    const component = TestBed.createComponent(ListsScreenComponent).componentInstance;
    component.ngOnInit();
    return component;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    api.owners.mockReturnValue(of([{ id: 1, acronym: 'CL_DESIGNER', description: '' }]));
  });

  it('shows the table first and fills the counts afterwards; a failed detail is null, not a broken table', () => {
    api.lists.mockReturnValue(of([row(1), row(2)]));
    api.list.mockImplementation((id: number) =>
      id === 1 ? of(detail(1, [{ type: 'text' }, { type: 'relation' }], 3)) : throwError(() => ({ status: 500 }))
    );
    const c = create();
    expect(c.state).toBe('ready');
    expect(c.rows[0].counts).toEqual({ fields: 2, records: 3, relations: 1 });
    expect(c.rows[1].counts).toBeNull();
    expect(c.owner(c.rows[0])).toBe('CL_DESIGNER');
  });

  it('keeps a zero count (records 0) instead of treating it as missing', () => {
    api.lists.mockReturnValue(of([row(1)]));
    api.list.mockReturnValue(of(detail(1, [], 0)));
    const c = create();
    expect(c.rows[0].counts).toEqual({ fields: 0, records: 0, relations: 0 });
  });

  it('says the module is off on 404, and the roles do not include it on 403', () => {
    api.lists.mockReturnValue(throwError(() => ({ status: 404, error: { message: 'Not Found' } })));
    expect(create().state).toBe('off');
    TestBed.resetTestingModule();
    api.lists.mockReturnValue(throwError(() => ({ status: 403, error: { message: 'Forbidden' } })));
    expect(create().state).toBe('forbidden');
  });

  it('shows an error with the generic line on a 5xx, and retries', () => {
    api.lists.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    const c = create();
    expect(c.state).toBe('error');
    expect(c.errorMessage).toContain('Could not complete the request');
    api.lists.mockReturnValue(of([]));
    c.load();
    expect(c.state).toBe('ready');
    expect(c.rows).toEqual([]);
  });

  it('survives owners failing, falling back to the role number', () => {
    api.owners.mockReturnValue(throwError(() => ({ status: 500 })));
    api.lists.mockReturnValue(of([row(1)]));
    api.list.mockReturnValue(of(detail(1, [])));
    const c = create();
    expect(c.owner(c.rows[0])).toBe('Role #1');
  });

  it('opens the workspace of a row and of a new list', () => {
    api.lists.mockReturnValue(of([row(4)]));
    api.list.mockReturnValue(of(detail(4, [])));
    const c = create();
    c.open(c.rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/clarisa-panel/manage/control-lists', 4]);
    c.onCreated(row(9) as never);
    expect(router.navigate).toHaveBeenCalledWith(['/clarisa-panel/manage/control-lists', 9]);
  });
});

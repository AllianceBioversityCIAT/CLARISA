import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ControlListsApiService } from '../services/control-lists-api.service';
import { ListWorkspaceComponent } from './list-workspace.component';

const detail = (over: object = {}) => ({
  id: 7,
  code: 'crops',
  name: 'Crops',
  status: 'draft',
  owner_role_id: 1,
  pending_changes: 0,
  rows: 0,
  fields: [{ id: 1 }],
  ...over
});

describe('ListWorkspaceComponent', () => {
  const api = { list: jest.fn(), lists: jest.fn(), types: jest.fn(), owners: jest.fn(), publicUrl: jest.fn() };
  const router = { navigate: jest.fn() };
  const toast = { add: jest.fn() };
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function create(id = '7', tab: string | null = null): ListWorkspaceComponent {
    params = new BehaviorSubject(convertToParamMap({ id }));
    query = new BehaviorSubject(convertToParamMap(tab ? { tab } : {}));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [ListWorkspaceComponent],
      providers: [
        { provide: ControlListsApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: toast },
        { provide: ActivatedRoute, useValue: { paramMap: params, queryParamMap: query } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(ListWorkspaceComponent, { set: { template: '<div></div>' } });
    const c = TestBed.createComponent(ListWorkspaceComponent).componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    api.list.mockReturnValue(of(detail()));
    api.lists.mockReturnValue(of([]));
    api.types.mockReturnValue(of([{ value: 'text', label: 'Short text' }]));
    api.owners.mockReturnValue(of([{ id: 1, acronym: 'CL', description: '' }]));
  });

  it('loads the list and its reference data, defaulting to the Fields tab', () => {
    const c = create();
    expect(c.state).toBe('ready');
    expect(c.tab).toBe('fields');
    expect(c.ownerName).toBe('CL');
    expect(c.types).toHaveLength(1);
  });

  it('picks the tab from ?tab= and ignores an unknown one', () => {
    expect(create('7', 'records').tab).toBe('records');
    expect(create('7', 'nope').tab).toBe('fields');
  });

  it('still opens when the reference lists fail', () => {
    api.types.mockReturnValue(throwError(() => ({ status: 500 })));
    api.lists.mockReturnValue(throwError(() => ({ status: 500 })));
    const c = create();
    expect(c.state).toBe('ready');
    expect(c.types).toEqual([]);
  });

  it('says «not found» for 404 / 403 and for a bad id, and an error for 5xx', () => {
    api.list.mockReturnValue(throwError(() => ({ status: 404 })));
    expect(create().state).toBe('missing');
    api.list.mockReturnValue(throwError(() => ({ status: 403 })));
    expect(create().state).toBe('missing');
    expect(create('abc').state).toBe('missing');
    expect(create('0').state).toBe('missing');
    api.list.mockReturnValue(throwError(() => ({ status: 503 })));
    const c = create();
    expect(c.state).toBe('error');
    expect(c.errorMessage).toContain('temporarily unavailable');
  });

  it('allows publishing only with at least one field and no change in progress', () => {
    expect(create().canPublish).toBe(true);
    api.list.mockReturnValue(of(detail({ fields: [] })));
    const empty = create();
    expect(empty.canPublish).toBe(false);
    expect(empty.publishHint).toBe('Add at least one field to publish.');
    api.list.mockReturnValue(of(detail({ pending_changes: 2 })));
    expect(create().canPublish).toBe(false);
  });

  it('reads the list again after a write and keeps what is shown if that fails', () => {
    const c = create();
    api.list.mockReturnValue(of(detail({ status: 'published' })));
    c.reload();
    expect(c.published).toBe(true);
    api.list.mockReturnValue(throwError(() => ({ status: 500 })));
    c.reload();
    expect(c.published).toBe(true);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
  });

  it('changes the tab through the query param and goes back to the lists after a delete', () => {
    const c = create();
    c.setTab('records');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { tab: 'records' }, queryParamsHandling: 'merge' }));
    c.onListDeleted();
    expect(router.navigate).toHaveBeenLastCalledWith(['/clarisa-panel/manage/control-lists']);
  });
});

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, of, Subject, throwError, TimeoutError } from 'rxjs';
import { ReloadReason } from '../models/control-lists.models';
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

  it('names its tabs with the words of the screens', () => {
    expect(create().tabs.map(t => t.label)).toEqual(['Fields', 'Records', 'Public address']);
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

  describe('while the list is read again', () => {
    it('is refreshing from reload() until the answer, and the old data stays', () => {
      const c = create();
      const answer = new Subject<unknown>();
      api.list.mockReturnValue(answer);
      c.reload();
      expect(c.refreshing).toBe(true);
      expect(c.state).toBe('ready');
      expect(c.detail?.status).toBe('draft');
      answer.next(detail({ status: 'published' }));
      answer.complete();
      expect(c.refreshing).toBe(false);
      expect(c.published).toBe(true);
    });

    it('stops refreshing when the read fails, too', () => {
      const c = create();
      api.list.mockReturnValue(new Subject());
      c.reload();
      expect(c.refreshing).toBe(true);
      api.list.mockReturnValue(throwError(() => ({ status: 500 })));
      c.reload();
      expect(c.refreshing).toBe(false);
    });

    it('is not refreshing after a first load, and a new load cancels a refresh', () => {
      const c = create();
      expect(c.refreshing).toBe(false);
      api.list.mockReturnValue(new Subject());
      c.reload();
      api.list.mockReturnValue(of(detail()));
      c.load();
      expect(c.refreshing).toBe(false);
    });
  });

  describe('when the read after a write fails', () => {
    const fail = (c: ListWorkspaceComponent, status: number, reason?: ReloadReason) => {
      api.list.mockReturnValue(throwError(() => ({ status, error: { message: 'Nope.' } })));
      c.reload(reason);
    };
    const said = () => toast.add.mock.calls[toast.add.mock.calls.length - 1][0].detail as string;

    it('says the change was saved only when a write asked for the reload', () => {
      const c = create();
      fail(c, 500, 'saved');
      expect(said()).toContain('The change was saved, but the list could not be refreshed.');
      fail(c, 500);
      expect(said()).toContain('The change was saved');
    });

    it('does not claim a save after «Check again»', () => {
      const c = create();
      fail(c, 500, 'check');
      expect(said()).toContain('The list could not be checked.');
      expect(said()).not.toContain('was saved');
    });

    it('does not claim a save after a write whose outcome is unknown', () => {
      const c = create();
      fail(c, 500, 'unsettled');
      expect(said()).toContain('did not confirm the last change');
      expect(said()).not.toContain('was saved');
    });

    it('does not claim a save after «Retry»', () => {
      const c = create();
      fail(c, 500, 'retry');
      expect(said()).toContain('could not be loaded again');
      expect(said()).not.toContain('was saved');
    });

    it.each([404, 403])('a %s means the list is gone or not ours: the screen says «not found», no toast', status => {
      const c = create();
      fail(c, status, 'saved');
      expect(c.state).toBe('missing');
      expect(c.detail).toBeNull();
      expect(c.refreshing).toBe(false);
      expect(toast.add).not.toHaveBeenCalled();
    });

    it('keeps the list on screen for a 500 and for no answer at all', () => {
      const c = create();
      fail(c, 500);
      expect(c.state).toBe('ready');
      expect(c.detail).not.toBeNull();
      api.list.mockReturnValue(throwError(() => new TimeoutError()));
      c.reload('check');
      expect(c.state).toBe('ready');
      expect(said()).toContain('The server is taking too long to answer.');
    });
  });

  describe('reference data that could not be read', () => {
    it('keeps the screen usable and says what is missing', () => {
      api.types.mockReturnValue(throwError(() => ({ status: 500 })));
      api.lists.mockReturnValue(throwError(() => ({ status: 500 })));
      const c = create();
      expect(c.state).toBe('ready');
      expect(c.failedParts).toEqual(['lists', 'types']);
      expect(c.partsText).toBe('the other lists, the field types');
      expect(c.has('lists')).toBe(true);
      expect(c.has('owners')).toBe(false);
    });

    it('names the owner roles too', () => {
      api.owners.mockReturnValue(throwError(() => ({ status: 500 })));
      const c = create();
      expect(c.failedParts).toEqual(['owners']);
      expect(c.partsText).toBe('the owner roles');
    });

    it('says nothing when everything loaded', () => {
      expect(create().failedParts).toEqual([]);
    });

    it('Retry reads the missing parts again and the notice goes away', () => {
      api.types.mockReturnValue(throwError(() => ({ status: 500 })));
      api.lists.mockReturnValue(throwError(() => ({ status: 500 })));
      const c = create();
      api.types.mockClear();
      api.owners.mockClear();
      api.types.mockReturnValue(of([{ value: 'text', label: 'Short text' }]));
      api.lists.mockReturnValue(of([{ id: 9, code: 'crops' }]));
      c.retryParts();
      expect(api.types).toHaveBeenCalledTimes(1);
      // What loaded the first time is not asked again.
      expect(api.owners).not.toHaveBeenCalled();
      expect(c.types).toHaveLength(1);
      expect(c.lists).toHaveLength(1);
      expect(c.failedParts).toEqual([]);
    });

    it('Retry that fails again keeps the notice and what was already there', () => {
      api.types.mockReturnValue(throwError(() => ({ status: 500 })));
      const c = create();
      c.retryParts();
      expect(c.failedParts).toEqual(['types']);
      expect(c.owners).toHaveLength(1);
      expect(c.refreshing).toBe(false);
    });

    it('a reload after a write does not ask for the types and owners that loaded', () => {
      const c = create();
      api.types.mockClear();
      api.owners.mockClear();
      c.reload('saved');
      expect(api.types).not.toHaveBeenCalled();
      expect(api.owners).not.toHaveBeenCalled();
    });
  });

  describe('tabs by keyboard', () => {
    function row(): { buttons: HTMLElement[]; press: (c: ListWorkspaceComponent, index: number, key: string) => KeyboardEvent } {
      const nav = document.createElement('nav');
      const buttons = ['fields', 'records', 'endpoint'].map(() => {
        const b = document.createElement('button');
        b.setAttribute('role', 'tab');
        nav.appendChild(b);
        return b;
      });
      document.body.appendChild(nav);
      return {
        buttons,
        press: (c, index, key) => {
          const event = new KeyboardEvent('keydown', { key, cancelable: true });
          Object.defineProperty(event, 'currentTarget', { value: buttons[index] });
          c.onTabKey(event, index);
          return event;
        }
      };
    }

    afterEach(() => document.querySelectorAll('nav').forEach(n => n.remove()));

    it('only the current tab is a tab stop', () => {
      const c = create('7', 'records');
      expect(c.tabs.map(t => c.tabIndex(t.id))).toEqual([-1, 0, -1]);
      expect(create().tabs.map(t => create().tabIndex(t.id))).toEqual([0, -1, -1]);
    });

    it('Right and Left move through the tabs and wrap around', () => {
      const { press } = row();
      const c = create();
      // The router would move `tab`; the test does it by hand between key presses.
      press(c, 0, 'ArrowRight');
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tab: 'records' } }));
      c.tab = 'endpoint';
      press(c, 2, 'ArrowRight');
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tab: 'fields' } }));
      c.tab = 'fields';
      press(c, 0, 'ArrowLeft');
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tab: 'endpoint' } }));
      c.tab = 'endpoint';
      press(c, 2, 'ArrowLeft');
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tab: 'records' } }));
    });

    it('Home and End go to the first and the last tab', () => {
      const { press } = row();
      const c = create('7', 'records');
      press(c, 1, 'End');
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tab: 'endpoint' } }));
      c.tab = 'endpoint';
      press(c, 2, 'Home');
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tab: 'fields' } }));
    });

    it('moves the keyboard to the tab it opens, and keeps the arrows from scrolling the page', () => {
      const { buttons, press } = row();
      const c = create();
      const event = press(c, 0, 'ArrowRight');
      expect(document.activeElement).toBe(buttons[1]);
      expect(event.defaultPrevented).toBe(true);
    });

    it('ignores every other key', () => {
      const { press } = row();
      const c = create();
      router.navigate.mockClear();
      const event = press(c, 0, 'a');
      press(c, 0, 'Tab');
      press(c, 0, 'Enter');
      expect(router.navigate).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });

  it('changes the tab through the query param and goes back to the lists after a delete', () => {
    const c = create();
    c.setTab('records');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { tab: 'records' }, queryParamsHandling: 'merge' }));
    c.onListDeleted();
    expect(router.navigate).toHaveBeenLastCalledWith(['/clarisa-panel/manage/control-lists']);
  });
});

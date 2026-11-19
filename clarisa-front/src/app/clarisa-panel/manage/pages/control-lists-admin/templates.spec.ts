import { Component, ContentChildren, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, QueryList, SimpleChange, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService, PrimeTemplate, SharedModule } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { DeleteListDialogComponent } from './components/delete-list-dialog/delete-list-dialog.component';
import { DiscardBarComponent } from './components/discard-bar/discard-bar.component';
import { FieldAddDialogComponent } from './components/field-add-dialog/field-add-dialog.component';
import { FieldRenameDialogComponent } from './components/field-rename-dialog/field-rename-dialog.component';
import { FieldsTabComponent } from './components/fields-tab/fields-tab.component';
import { NewListDialogComponent } from './components/new-list-dialog/new-list-dialog.component';
import { PublishDialogComponent } from './components/publish-dialog/publish-dialog.component';
import { RecordDialogComponent } from './components/record-dialog/record-dialog.component';
import { RecordStatusDialogComponent } from './components/record-status-dialog/record-status-dialog.component';
import { WriteDialogBase } from './components/write-dialog.base';
import { ListWorkspaceComponent } from './list-workspace/list-workspace.component';
import { ListsScreenComponent } from './lists-screen/lists-screen.component';
import { FieldRow, ListDetail } from './models/control-lists.models';
import { ControlListsApiService } from './services/control-lists-api.service';

/**
 * The real templates, drawn: what the other specs cannot see because they swap
 * the template for an empty one. PrimeNG's dialog is a stand-in that only draws
 * its content; the inputs, switches, dropdowns and tables are the real ones.
 */
@Component({ selector: 'p-dialog', template: '<div class="dlg" *ngIf="visible"><ng-content></ng-content></div>' })
class DialogStub {
  @Input() visible = false;
}

/** `primeng/table` cannot be loaded by Jest (a circular import inside the package): a table that draws the same templates. */
@Component({
  selector: 'p-table',
  template: `<table>
    <thead>
      <ng-container *ngTemplateOutlet="named('header')"></ng-container>
    </thead>
    <tbody>
      <ng-container *ngFor="let row of value"
        ><ng-container *ngTemplateOutlet="named('body'); context: { $implicit: row }"></ng-container
      ></ng-container>
      <ng-container *ngIf="!value?.length"><ng-container *ngTemplateOutlet="named('emptymessage')"></ng-container></ng-container>
    </tbody>
  </table>`
})
class TableStub {
  @Input() value: unknown[] = [];
  @ContentChildren(PrimeTemplate) templates!: QueryList<PrimeTemplate>;
  named(name: string) {
    return this.templates?.find(t => t.getType() === name)?.template ?? null;
  }
}

@Component({ selector: 'app-cl-list-path', template: '' })
class PathStub {
  @Input() list: unknown;
  @Input() onRecords = false;
  @Output() publish = new EventEmitter<void>();
  @Output() records = new EventEmitter<void>();
}

const api = {
  publicUrl: (code: string) => `https://api/control-lists/${code}`,
  deleteImpact: jest.fn(),
  fieldImpact: jest.fn(),
  list: jest.fn(),
  lists: jest.fn(),
  types: jest.fn(),
  owners: jest.fn(),
  sql: jest.fn()
};

const field = (over: Partial<FieldRow> = {}): FieldRow =>
  ({
    id: 11,
    list_id: 7,
    code: 'name',
    label: 'Name',
    type: 'text',
    is_required: 0,
    is_unique: 0,
    is_indexed: 0,
    relation_list_id: null,
    position: 1,
    status: 'published',
    type_label: 'Short text',
    relation_name: null,
    relation_code: null,
    ...over
  }) as FieldRow;

const list = {
  id: 7,
  code: 'crops',
  name: 'Crops',
  status: 'draft',
  rows: 0,
  pending_changes: 0,
  owner_role_id: 1,
  fields: [field()]
} as unknown as ListDetail;

const SHARED = [DialogStub, TableStub, DiscardBarComponent];
const IMPORTS = [
  FormsModule,
  ButtonModule,
  InputTextModule,
  InputTextareaModule,
  InputSwitchModule,
  DropdownModule,
  SharedModule,
  NoopAnimationsModule
];

async function draw<T extends WriteDialogBase<any>>(type: Type<T>, inputs: Record<string, unknown> = {}): Promise<ComponentFixture<T>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    declarations: [type, ...SHARED],
    imports: IMPORTS,
    providers: [{ provide: ControlListsApiService, useValue: api }, MessageService],
    schemas: [NO_ERRORS_SCHEMA]
  }).compileComponents();
  const fixture = TestBed.createComponent(type);
  const c: any = fixture.componentInstance;
  Object.assign(c, inputs, { visible: true });
  c.ngOnChanges({ visible: new SimpleChange(false, true, true) });
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const q = <E extends Element = HTMLElement>(f: ComponentFixture<unknown>, selector: string): E | null => f.nativeElement.querySelector(selector);
const text = (f: ComponentFixture<unknown>): string => (f.nativeElement.textContent as string).replace(/\s+/g, ' ');

describe('the dialogs as drawn', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('new list', () => {
    const roles = [
      { id: 1, acronym: 'CL', description: 'Control lists' },
      { id: 2, acronym: 'GL', description: 'Glossary' }
    ];

    it('tags the owner as required when there are several roles, and its label points at the dropdown', async () => {
      const f = await draw(NewListDialogComponent, { owners: roles });
      const label = q(f, '#cl-new-owner-label') as HTMLElement;
      expect(label.textContent).toContain('Required');
      expect(label.getAttribute('for')).toBe('cl-new-owner');
      expect(q(f, '#cl-new-owner')).not.toBeNull();
      expect((q(f, 'button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('with one role there is no tag, and no label pointing at nothing', async () => {
      const f = await draw(NewListDialogComponent, { owners: [roles[0]] });
      const label = q(f, '#cl-new-owner-label') as HTMLElement;
      expect(label.textContent).not.toContain('Required');
      expect(label.hasAttribute('for')).toBe(false);
      expect(q(f, '[aria-labelledby="cl-new-owner-label"]')?.textContent).toContain('CL');
    });

    it('stops typing at the limits of the back', async () => {
      const f = await draw(NewListDialogComponent, { owners: [] });
      expect(q(f, '#cl-new-name')?.getAttribute('maxlength')).toBe('150');
      expect(q(f, '#cl-new-code')?.getAttribute('maxlength')).toBe('50');
      expect(q(f, '#cl-new-desc')?.getAttribute('maxlength')).toBe('500');
    });

    it('says a reserved code is a reserved word', async () => {
      const f = await draw(NewListDialogComponent, { owners: [] });
      const c: any = f.componentInstance;
      c.name = 'Crops';
      c.code = 'admin';
      c.onCodeChange();
      await settle(f);
      expect(text(f)).toContain('"admin" is a reserved word. Choose another code.');
      expect(q(f, '#cl-new-code')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('shows «Discard what you wrote?» above the buttons when closed with a name typed, and not before', async () => {
      const f = await draw(NewListDialogComponent, { owners: [] });
      expect(q(f, 'app-cl-discard-bar')).toBeNull();
      const c: any = f.componentInstance;
      c.name = 'Crops';
      c.onNameChange();
      c.close();
      await settle(f);
      const bar = q(f, 'app-cl-discard-bar') as HTMLElement;
      expect(bar).not.toBeNull();
      const actions = q(f, '.admin-form__actions') as HTMLElement;
      expect(bar.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(document.activeElement?.textContent).toContain('Keep editing');

      (bar.querySelectorAll('button')[0] as HTMLButtonElement).click();
      await settle(f);
      expect(q(f, 'app-cl-discard-bar')).toBeNull();
      expect(c.visible).toBe(true);

      c.close();
      await settle(f);
      (q(f, 'app-cl-discard-bar')?.querySelectorAll('button')[1] as HTMLButtonElement).click();
      await settle(f);
      expect(c.visible).toBe(false);
    });
  });

  describe('add field', () => {
    it('long text: Unique and Filterable are off and disabled, and the hint says why', async () => {
      const f = await draw(FieldAddDialogComponent, { list, types: [{ value: 'long_text', label: 'Long text' }] });
      const c: any = f.componentInstance;
      c.label = 'Notes';
      c.onLabelChange();
      c.isUnique = true;
      c.isIndexed = true;
      c.onTypeChange('long_text');
      await settle(f);
      const unique = q(f, '#cl-fa-uniq') as HTMLInputElement;
      const filterable = q(f, '#cl-fa-idx') as HTMLInputElement;
      expect(unique.disabled).toBe(true);
      expect(filterable.disabled).toBe(true);
      expect(unique.checked).toBe(false);
      expect(filterable.checked).toBe(false);
      expect((q(f, 'label[for=cl-fa-uniq]') as HTMLElement).textContent).toContain('Not available for long text');
      expect((q(f, 'label[for=cl-fa-idx]') as HTMLElement).textContent).toContain('Not available for long text');
      expect((q(f, '#cl-fa-req') as HTMLInputElement).disabled).toBe(false);
    });

    it('short text keeps both switches and their usual hints', async () => {
      const f = await draw(FieldAddDialogComponent, { list });
      (f.componentInstance as any).onTypeChange('text');
      await settle(f);
      expect((q(f, '#cl-fa-uniq') as HTMLInputElement).disabled).toBe(false);
      expect((q(f, '#cl-fa-idx') as HTMLInputElement).disabled).toBe(false);
      expect(text(f)).toContain('No two records share a value.');
      expect(text(f)).not.toContain('Not available');
    });

    it('Required is off and disabled on a published list with records', async () => {
      const f = await draw(FieldAddDialogComponent, { list: { ...list, status: 'published', rows: 4 } });
      expect((q(f, '#cl-fa-req') as HTMLInputElement).disabled).toBe(true);
      expect((q(f, '#cl-fa-req') as HTMLInputElement).checked).toBe(false);
      expect((q(f, 'label[for=cl-fa-req]') as HTMLElement).textContent).toContain('Not available');
      expect((q(f, '#cl-fa-uniq') as HTMLInputElement).disabled).toBe(false);
    });

    it('Required stays free on a draft', async () => {
      const f = await draw(FieldAddDialogComponent, { list });
      expect((q(f, '#cl-fa-req') as HTMLInputElement).disabled).toBe(false);
    });

    it('stops typing at the limits of the back, in every box', async () => {
      const f = await draw(FieldAddDialogComponent, { list, types: [{ value: 'relation', label: 'Options' }] });
      const c: any = f.componentInstance;
      c.label = 'Type';
      c.onLabelChange();
      c.onTypeChange('relation');
      c.codeOpen = true;
      c.optionsOpen = true;
      await settle(f);
      expect(q(f, '#cl-fa-label')?.getAttribute('maxlength')).toBe('150');
      expect(q(f, '#cl-fa-code')?.getAttribute('maxlength')).toBe('50');
      expect(q(f, '#cl-fa-oname')?.getAttribute('maxlength')).toBe('150');
      expect(q(f, '#cl-fa-ocode')?.getAttribute('maxlength')).toBe('50');
    });

    it('opens the code box with the reserved-word message', async () => {
      const f = await draw(FieldAddDialogComponent, { list });
      const c: any = f.componentInstance;
      c.label = 'Order';
      c.onLabelChange();
      c.code = 'order';
      c.onCodeChange();
      await settle(f);
      expect(q(f, '#cl-fa-code')).not.toBeNull();
      expect(text(f)).toContain('"order" is a reserved word. Choose another code.');
    });

    it('says the other lists could not be loaded, and still offers to write the options', async () => {
      const f = await draw(FieldAddDialogComponent, { list, listsFailed: true, targets: [] });
      (f.componentInstance as any).onTypeChange('relation');
      await settle(f);
      expect(text(f)).toContain('The other lists could not be loaded');
      expect(text(f)).toContain('The server will check the code');
      expect(q(f, '#cl-fa-options')).not.toBeNull();
    });

    it('is quiet about the lists when they loaded', async () => {
      const f = await draw(FieldAddDialogComponent, { list, listsFailed: false });
      (f.componentInstance as any).onTypeChange('relation');
      await settle(f);
      expect(text(f)).not.toContain('could not be loaded');
    });

    it('calls the list of an existing options field «Options list»', async () => {
      const f = await draw(FieldAddDialogComponent, { list, targets: [{ id: 5, name: 'Kinds', code: 'kinds' }] });
      const c: any = f.componentInstance;
      c.onTypeChange('relation');
      c.setSource('existing');
      await settle(f);
      expect((q(f, 'label[for=cl-fa-rel]') as HTMLElement).textContent).toContain('Options list');
    });
  });

  describe('rename field', () => {
    it('stops typing at the limits and shows the reserved-word message', async () => {
      const f = await draw(FieldRenameDialogComponent, { field: field() });
      expect(q(f, '#cl-fr-label')?.getAttribute('maxlength')).toBe('150');
      expect(q(f, '#cl-fr-code')?.getAttribute('maxlength')).toBe('50');
      (f.componentInstance as any).code = 'select';
      await settle(f);
      expect(text(f)).toContain('"select" is a reserved word. Choose another code.');
    });
  });

  describe('record', () => {
    const fields = [
      field({ id: 1, code: 'name', label: 'Name', type: 'text', is_required: 1 }),
      field({ id: 2, code: 'bio', label: 'Bio', type: 'long_text' }),
      field({ id: 3, code: 'mail', label: 'Mail', type: 'email' }),
      field({ id: 4, code: 'site', label: 'Site', type: 'url' }),
      field({ id: 5, code: 'size', label: 'Size', type: 'integer' }),
      field({ id: 6, code: 'share', label: 'Share', type: 'decimal' })
    ];

    it('stops typing at the length each text type holds, and not for numbers', async () => {
      const f = await draw(RecordDialogComponent, { code: 'crops', fields, record: null });
      expect(q(f, '#cl-rec-name')?.getAttribute('maxlength')).toBe('255');
      expect(q(f, '#cl-rec-bio')?.getAttribute('maxlength')).toBe('65000');
      expect(q(f, '#cl-rec-mail')?.getAttribute('maxlength')).toBe('255');
      expect(q(f, '#cl-rec-site')?.getAttribute('maxlength')).toBe('500');
      expect(q(f, '#cl-rec-size')?.hasAttribute('maxlength')).toBe(false);
      expect(q(f, '#cl-rec-share')?.hasAttribute('maxlength')).toBe(false);
    });

    it('keeps the button off and says which required field is empty', async () => {
      const f = await draw(RecordDialogComponent, { code: 'crops', fields, record: null });
      expect((q(f, 'button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
      expect(text(f)).toContain('Fill in to continue: Name.');
      (f.componentInstance as any).values = { ...(f.componentInstance as any).values, name: 'Maize' };
      await settle(f);
      expect((q(f, 'button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
      expect(text(f)).not.toContain('Fill in to continue');
    });

    it('edit: the button is off while a required field is cleared', async () => {
      const f = await draw(RecordDialogComponent, { code: 'crops', fields, record: { id: 4, name: 'Maize', size: 2, is_active: true } });
      const c: any = f.componentInstance;
      c.values = { ...c.values, size: '3' };
      await settle(f);
      expect((q(f, 'button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
      c.values = { ...c.values, name: '' };
      await settle(f);
      expect((q(f, 'button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('says what the reason is saved as, without promising a history', async () => {
      const f = await draw(RecordDialogComponent, { code: 'crops', fields, record: { id: 4, name: 'Maize', is_active: true } });
      expect(text(f)).toContain('Saved with the record as the reason for its latest change.');
      expect(text(f)).not.toContain('history');
    });

    const crop = field({ id: 9, code: 'crop', label: 'Crop', type: 'relation', is_required: 1, relation_code: 'crops', relation_name: 'Crops' });

    it('required Options with no active record: the hint under the empty dropdown, naming the list', async () => {
      const f = await draw(RecordDialogComponent, {
        code: 'varieties',
        fields: [crop],
        related: { crops: [{ id: 2, name: 'Old', is_active: false }] },
        record: null
      });
      expect(text(f)).toContain('"Crops" has no active records yet. Add one there first.');
    });

    it('no hint when there are records to choose from', async () => {
      const f = await draw(RecordDialogComponent, {
        code: 'varieties',
        fields: [crop],
        related: { crops: [{ id: 1, name: 'Maize', is_active: true }] },
        record: null
      });
      expect(text(f)).not.toContain('has no active records yet');
    });

    it('the dropdown says «Select from Crops»', async () => {
      const f = await draw(RecordDialogComponent, {
        code: 'varieties',
        fields: [crop],
        related: { crops: [{ id: 1, name: 'Maize', is_active: true }] },
        record: null
      });
      expect(q(f, '.p-dropdown-label')?.textContent).toContain('Select from Crops');
    });

    it('closed with something typed it asks first', async () => {
      const f = await draw(RecordDialogComponent, { code: 'crops', fields, record: null });
      const c: any = f.componentInstance;
      c.values = { ...c.values, name: 'Maize' };
      c.close();
      await settle(f);
      expect(q(f, 'app-cl-discard-bar')).not.toBeNull();
    });
  });

  describe('record status', () => {
    it('says what the reason is saved as, and asks before dropping it', async () => {
      const f = await draw(RecordStatusDialogComponent, { code: 'crops', record: { id: 4 }, mode: 'deactivate' });
      expect(text(f)).toContain('Saved with the record as the reason for its latest change.');
      expect(text(f)).not.toContain('history');
      const c: any = f.componentInstance;
      c.close();
      expect(c.visible).toBe(false);
      c.visible = true;
      c.ngOnChanges({ visible: new SimpleChange(false, true, false) });
      c.reason = 'duplicate';
      c.close();
      await settle(f);
      expect(q(f, 'app-cl-discard-bar')).not.toBeNull();
    });
  });

  describe('publish', () => {
    it('says a published list cannot be unpublished, only deleted', async () => {
      const f = await draw(PublishDialogComponent, { list });
      expect(text(f)).toContain('A published list cannot be unpublished, only deleted.');
    });
  });

  describe('delete list', () => {
    it('offers «Try again» next to the error, and it reads the impact again', async () => {
      api.deleteImpact.mockReturnValueOnce(throwError(() => ({ status: 500 })));
      const f = await draw(DeleteListDialogComponent, { list });
      const retry = Array.from(f.nativeElement.querySelectorAll('button')).find(b =>
        (b as HTMLElement).textContent?.includes('Try again')
      ) as HTMLButtonElement;
      expect(retry).toBeTruthy();
      api.deleteImpact.mockReturnValueOnce(of({ rows: 0, dependents: [], message: 'No records.' }));
      retry.click();
      await settle(f);
      expect(api.deleteImpact).toHaveBeenCalledTimes(2);
      expect(text(f)).not.toContain('Try again');
      expect(text(f)).toContain('No records.');
    });

    it('has no «Try again» when the impact loaded', async () => {
      api.deleteImpact.mockReturnValue(of({ rows: 0, dependents: [], message: 'No records.' }));
      const f = await draw(DeleteListDialogComponent, { list });
      expect(text(f)).not.toContain('Try again');
    });
  });
});

describe('the workspace as drawn', () => {
  const detail = { ...list, fields: [field()] };

  async function drawWorkspace(): Promise<ComponentFixture<ListWorkspaceComponent>> {
    api.list.mockReturnValue(of(detail));
    api.lists.mockReturnValue(of([]));
    api.types.mockReturnValue(of([{ value: 'text', label: 'Short text' }]));
    api.owners.mockReturnValue(of([{ id: 1, acronym: 'CL', description: '' }]));
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [ListWorkspaceComponent, PathStub],
      imports: [ButtonModule],
      providers: [
        { provide: ControlListsApiService, useValue: api },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: MessageService, useValue: { add: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: new BehaviorSubject(convertToParamMap({ id: '7' })), queryParamMap: new BehaviorSubject(convertToParamMap({})) }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const f = TestBed.createComponent(ListWorkspaceComponent);
    f.detectChanges();
    return f;
  }

  it('shows nothing busy while it is not refreshing', async () => {
    const f = await drawWorkspace();
    expect(q(f, '#cl-panel')?.hasAttribute('aria-busy')).toBe(false);
    expect(q(f, 'app-cl-list-path')?.hasAttribute('aria-busy')).toBe(false);
    expect(q(f, '.ws-pill')).toBeNull();
    expect(q(f, '.ws-veil')).toBeNull();
    expect(q(f, '.ws-live')?.getAttribute('role')).toBe('status');
  });

  it('marks the panel and the path busy, dims them and shows «Updating…» while the list is read again', async () => {
    const f = await drawWorkspace();
    const answer = new Subject<unknown>();
    api.list.mockReturnValue(answer);
    f.componentInstance.reload('saved');
    f.detectChanges();
    expect(q(f, '#cl-panel')?.getAttribute('aria-busy')).toBe('true');
    expect(q(f, 'app-cl-list-path')?.getAttribute('aria-busy')).toBe('true');
    expect(q(f, 'app-cl-list-path')?.classList.contains('is-busy')).toBe(true);
    expect(q(f, '.ws-veil')).not.toBeNull();
    expect(q(f, '.ws-live .ws-pill')?.textContent).toContain('Updating…');

    answer.next(detail);
    answer.complete();
    f.detectChanges();
    expect(q(f, '#cl-panel')?.hasAttribute('aria-busy')).toBe(false);
    expect(q(f, 'app-cl-list-path')?.classList.contains('is-busy')).toBe(false);
    expect(q(f, '.ws-pill')).toBeNull();
    expect(q(f, '.ws-veil')).toBeNull();
  });

  it('the tabs are a roving tablist: one tab stop, the arrows do the rest', async () => {
    const f = await drawWorkspace();
    const tabs = Array.from(f.nativeElement.querySelectorAll('[role=tab]')) as HTMLElement[];
    expect(tabs.map(t => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(tabs[1]);
  });

  it('shows one warning with Retry when part of the reference data could not be loaded', async () => {
    api.types.mockReturnValue(throwError(() => ({ status: 500 })));
    const f = await drawWorkspace();
    api.types.mockReturnValue(throwError(() => ({ status: 500 })));
    f.componentInstance.load();
    f.detectChanges();
    const note = q(f, '.ws-partial') as HTMLElement;
    expect(note.textContent).toContain('Part of this screen could not be loaded: the field types.');
    expect(note.textContent).toContain('Retry');
    api.types.mockReturnValue(of([{ value: 'text', label: 'Short text' }]));
    (note.querySelector('button') as HTMLButtonElement).click();
    f.detectChanges();
    expect(q(f, '.ws-partial')).toBeNull();
  });
});

describe('the lists screen as drawn', () => {
  it('says «Linked lists» and clamps a long description to two lines, with the whole text in its title', async () => {
    const long = 'A very long description. '.repeat(30);
    api.lists.mockReturnValue(
      of([{ id: 1, code: 'crops', name: 'Crops', description: long, owner_role_id: 1, status: 'draft', updated_at: '2026-01-02' }])
    );
    api.owners.mockReturnValue(of([{ id: 1, acronym: 'CL', description: '' }]));
    api.list.mockReturnValue(of({ fields: [], rows: 0 }));
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [ListsScreenComponent, TableStub],
      imports: [ButtonModule, SharedModule, NoopAnimationsModule],
      providers: [
        { provide: ControlListsApiService, useValue: api },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const f = TestBed.createComponent(ListsScreenComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(text(f)).toContain('Linked lists');
    expect(text(f)).not.toContain('Relations');
    const desc = q(f, '.ls-desc') as HTMLElement;
    expect(desc.getAttribute('title')).toBe(long);
    expect(q(f, 'td.ls-name')).not.toBeNull();
  });
});

describe('the fields tab as drawn', () => {
  async function drawTab(over: Partial<ListDetail> = {}): Promise<ComponentFixture<FieldsTabComponent>> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [FieldsTabComponent, TableStub],
      imports: [ButtonModule, SharedModule, NoopAnimationsModule],
      providers: [{ provide: ControlListsApiService, useValue: api }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const f = TestBed.createComponent(FieldsTabComponent);
    f.componentInstance.detail = { ...list, ...over } as ListDetail;
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f;
  }

  it('calls the column «Options list» and the disclosure «Table definition (SQL)»', async () => {
    const f = await drawTab({ status: 'published' });
    expect(text(f)).toContain('Options list');
    expect(text(f)).not.toContain('Options from');
    expect(text(f)).toContain('Table definition (SQL)');
  });

  it('«Check again» asks to read the list again for that reason, not as if a change was saved', async () => {
    const f = await drawTab({ pending_changes: 2 });
    const reasons: string[] = [];
    f.componentInstance.changed.subscribe(r => reasons.push(r));
    const check = Array.from(f.nativeElement.querySelectorAll('button')).find(b =>
      (b as HTMLElement).textContent?.includes('Check again')
    ) as HTMLButtonElement;
    check.click();
    expect(reasons).toEqual(['check']);
  });
});

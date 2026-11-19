import { NO_ERRORS_SCHEMA, SimpleChange, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError, TimeoutError } from 'rxjs';
import { ControlListsApiService } from '../services/control-lists-api.service';
import { FieldRow, ListDetail } from '../models/control-lists.models';
import { FieldAddDialogComponent } from './field-add-dialog/field-add-dialog.component';
import { FieldDeleteDialogComponent } from './field-delete-dialog/field-delete-dialog.component';
import { FieldRenameDialogComponent } from './field-rename-dialog/field-rename-dialog.component';
import { FieldTypeDialogComponent } from './field-type-dialog/field-type-dialog.component';
import { DeleteListDialogComponent } from './delete-list-dialog/delete-list-dialog.component';
import { NewListDialogComponent } from './new-list-dialog/new-list-dialog.component';
import { PublishDialogComponent } from './publish-dialog/publish-dialog.component';
import { RecordDialogComponent } from './record-dialog/record-dialog.component';
import { RecordStatusDialogComponent } from './record-status-dialog/record-status-dialog.component';
import { UNKNOWN_OUTCOME, WriteDialogBase } from './write-dialog.base';

const api = {
  publicUrl: jest.fn((code: string) => `https://api/control-lists/${code}`),
  createList: jest.fn(),
  addField: jest.fn(),
  renameField: jest.fn(),
  changeType: jest.fn(),
  fieldImpact: jest.fn(),
  deleteField: jest.fn(),
  publish: jest.fn(),
  deleteImpact: jest.fn(),
  deleteList: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deactivateRecord: jest.fn()
};

const field = (over: Partial<FieldRow> = {}): FieldRow =>
  ({
    id: 11,
    list_id: 7,
    code: 'name',
    label: 'Name',
    type: 'text',
    is_required: 1,
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

const list = { id: 7, code: 'crops', name: 'Crops', status: 'draft', rows: 0, pending_changes: 0, fields: [field()] } as unknown as ListDetail;

async function open<T extends WriteDialogBase<any>>(type: Type<T>, inputs: Record<string, unknown> = {}): Promise<any> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    declarations: [type],
    imports: [FormsModule],
    providers: [{ provide: ControlListsApiService, useValue: api }, MessageService],
    schemas: [NO_ERRORS_SCHEMA]
  })
    .overrideComponent(type, { set: { template: '<div></div>' } })
    .compileComponents();
  const component: any = TestBed.createComponent(type).componentInstance;
  Object.assign(component, inputs, { visible: true });
  component.ngOnChanges({ visible: new SimpleChange(false, true, true) });
  return component;
}

interface Flow {
  name: string;
  type: Type<WriteDialogBase<any>>;
  inputs?: Record<string, unknown>;
  prepare?: (c: any) => void;
  method: keyof typeof api;
  /** The `request_id` the call carries, when it carries one. */
  requestId?: (args: any[]) => string | undefined;
}

const flows: Flow[] = [
  {
    name: 'create list',
    type: NewListDialogComponent,
    prepare: c => {
      c.name = 'Crops';
      c.onNameChange();
    },
    method: 'createList'
  },
  {
    name: 'add field',
    type: FieldAddDialogComponent,
    inputs: { list },
    prepare: c => {
      c.label = 'Name';
      c.onLabelChange();
      c.type = 'text';
    },
    method: 'addField',
    requestId: args => args[1].request_id
  },
  {
    name: 'rename field',
    type: FieldRenameDialogComponent,
    inputs: { field: field() },
    prepare: c => (c.label = 'Title'),
    method: 'renameField',
    requestId: args => args[1].request_id
  },
  {
    name: 'change field type',
    type: FieldTypeDialogComponent,
    inputs: { field: field(), types: [{ value: 'integer', label: 'Whole number' }] },
    prepare: c => {
      api.fieldImpact.mockReturnValue(of({ rows: 2, affected: 2, message: 'Two records change.' }));
      c.type = 'integer';
      c.onTypeChange();
    },
    method: 'changeType',
    requestId: args => args[1].request_id
  },
  { name: 'delete field', type: FieldDeleteDialogComponent, inputs: { field: field() }, method: 'deleteField', requestId: args => args[1] },
  { name: 'publish list', type: PublishDialogComponent, inputs: { list }, method: 'publish', requestId: args => args[1] },
  { name: 'delete list', type: DeleteListDialogComponent, inputs: { list }, method: 'deleteList', requestId: args => args[1] },
  {
    name: 'create record',
    type: RecordDialogComponent,
    inputs: { code: 'crops', fields: [field()], record: null },
    prepare: c => (c.values = { name: 'Maize' }),
    method: 'createRecord',
    requestId: args => args[1].request_id
  },
  {
    name: 'edit record',
    type: RecordDialogComponent,
    inputs: { code: 'crops', fields: [field()], record: { id: 4, name: 'Maize', is_active: true } },
    prepare: c => (c.values = { name: 'Rice' }),
    method: 'updateRecord'
  },
  {
    name: 'deactivate record',
    type: RecordStatusDialogComponent,
    inputs: { code: 'crops', record: { id: 4 }, mode: 'deactivate' },
    method: 'deactivateRecord'
  },
  {
    name: 'reactivate record',
    type: RecordStatusDialogComponent,
    inputs: { code: 'crops', record: { id: 4 }, mode: 'reactivate' },
    method: 'updateRecord'
  }
];

describe('write dialogs lock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.fieldImpact.mockReturnValue(of({ rows: 0, affected: 0, message: 'Nothing changes.' }));
    api.deleteImpact.mockReturnValue(of({ rows: 0, dependents: [], message: 'No records.' }));
  });

  describe.each(flows)('$name', flow => {
    it('sends one request for two taps, keeps the dialog open on a 4xx and retries with the same request_id', async () => {
      const dialog = await open(flow.type, flow.inputs);
      flow.prepare?.(dialog);
      const first = new Subject<unknown>();
      const second = new Subject<unknown>();
      const method = api[flow.method] as jest.Mock;
      method.mockReturnValueOnce(first).mockReturnValueOnce(second);

      dialog.submit();
      dialog.submit();
      expect(method).toHaveBeenCalledTimes(1);
      expect(dialog.saving).toBe(true);

      first.error({ status: 400, error: { message: 'The back says no.' } });
      expect(dialog.saving).toBe(false);
      expect(dialog.error).toBe('The back says no.');
      expect(dialog.visible).toBe(true);

      dialog.submit();
      expect(method).toHaveBeenCalledTimes(2);
      if (flow.requestId) {
        const id = flow.requestId(method.mock.calls[0]);
        expect(id).toBeTruthy();
        expect(flow.requestId(method.mock.calls[1])).toBe(id);
      }

      const closed = jest.fn();
      dialog.done.subscribe(closed);
      second.next({ id: 1, name: 'x', is_active: true, type_label: 'x' });
      second.complete();
      expect(closed).toHaveBeenCalledTimes(1);
      expect(dialog.visible).toBe(false);
      expect(dialog.saving).toBe(false);
    });

    it('uses a new request_id each time it opens', async () => {
      if (!flow.requestId) return;
      const dialog = await open(flow.type, flow.inputs);
      flow.prepare?.(dialog);
      const method = api[flow.method] as jest.Mock;
      method.mockReturnValue(new Subject());
      dialog.submit();
      const id = flow.requestId(method.mock.calls[0]);

      dialog.saving = false;
      dialog.visible = true;
      dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
      flow.prepare?.(dialog);
      dialog.submit();
      expect(flow.requestId(method.mock.calls[1])).not.toBe(id);
    });
  });
});

describe('write dialog details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.fieldImpact.mockReturnValue(of({ rows: 0, affected: 0, message: 'Nothing changes.' }));
    api.deleteImpact.mockReturnValue(of({ rows: 0, dependents: [], message: 'No records.' }));
  });

  it('follows the name with the code until the user edits the code by hand', async () => {
    const dialog = await open(NewListDialogComponent, { owners: [{ id: 3, acronym: 'CL', description: '' }] });
    dialog.name = 'Crop Varieties';
    dialog.onNameChange();
    expect(dialog.code).toBe('crop_varieties');
    dialog.code = 'varieties';
    dialog.onCodeChange();
    dialog.name = 'Other name';
    dialog.onNameChange();
    expect(dialog.code).toBe('varieties');
    dialog.code = '';
    dialog.onCodeChange();
    expect(dialog.code).toBe('other_name');
    expect(dialog.ownerId).toBe(3);
  });

  it('creates the list with the optional parts only when they are filled', async () => {
    const dialog = await open(NewListDialogComponent, { owners: [] });
    dialog.name = ' Crops ';
    dialog.onNameChange();
    api.createList.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.createList).toHaveBeenCalledWith({ code: 'crops', name: 'Crops' });
  });

  it('refuses an invalid code without calling the back', async () => {
    const dialog = await open(NewListDialogComponent);
    dialog.name = 'Crops';
    dialog.code = 'Bad-Code';
    dialog.onCodeChange();
    dialog.submit();
    expect(api.createList).not.toHaveBeenCalled();
  });

  it('adds a relation field with its related list, and no relation id for other types', async () => {
    const dialog = await open(FieldAddDialogComponent, { list });
    api.addField.mockReturnValue(new Subject());
    dialog.label = 'Crop';
    dialog.onLabelChange();
    dialog.onTypeChange('relation');
    dialog.setSource('existing');
    dialog.relationListId = null;
    expect(dialog.valid).toBe(false);
    dialog.relationListId = 5;
    dialog.isIndexed = true;
    dialog.submit();
    expect(api.addField.mock.calls[0][1]).toMatchObject({
      code: 'crop',
      type: 'relation',
      relation_list_id: 5,
      is_required: false,
      is_indexed: true
    });

    api.addField.mockClear();
    const text = await open(FieldAddDialogComponent, { list });
    text.label = 'Name';
    text.onLabelChange();
    text.type = 'text';
    text.relationListId = 5;
    text.submit();
    expect(api.addField.mock.calls[0][1].relation_list_id).toBeUndefined();
  });

  it('adds an options field with the options written in the dialog, saved as a list of its own', async () => {
    const dialog = await open(FieldAddDialogComponent, { list, takenCodes: ['crops', 'crops_type'] });
    api.addField.mockReturnValue(of(field({ label: 'Type', code: 'type', type: 'relation' })));
    dialog.label = 'Type';
    dialog.onLabelChange();
    dialog.onTypeChange('relation');
    // The short way is the default; the list is named after its parent and its code is one nobody uses.
    expect(dialog.source).toBe('new');
    expect(dialog.optionsName).toBe('Crops – Type');
    expect(dialog.optionsCode).toBe('crops_type_2');
    expect(dialog.valid).toBe(false);

    dialog.optionsText = 'Cereal\n  Root \n\nroot';
    expect(dialog.optionsError).toBe('"root" is repeated.');
    expect(dialog.valid).toBe(false);
    dialog.optionsText = 'Cereal\n  Root \n\nLegume';
    expect(dialog.valid).toBe(true);

    dialog.relationListId = 5;
    dialog.submit();
    const body = api.addField.mock.calls[0][1];
    expect(body).toMatchObject({
      code: 'type',
      type: 'relation',
      options_list: { code: 'crops_type_2', name: 'Crops – Type', options: ['Cereal', 'Root', 'Legume'] }
    });
    expect(body.relation_list_id).toBeUndefined();
  });

  it('keeps the name and code of the options list once the person edits them, and refuses a code in use', async () => {
    const dialog = await open(FieldAddDialogComponent, { list, takenCodes: ['crops', 'kinds'] });
    dialog.label = 'Type';
    dialog.onLabelChange();
    dialog.onTypeChange('relation');
    dialog.optionsText = 'Cereal';
    dialog.optionsName = 'Crop kinds';
    dialog.onOptionsNameChange();
    dialog.optionsCode = 'kinds';
    dialog.onOptionsCodeChange();
    dialog.label = 'Kind';
    dialog.onLabelChange();
    expect(dialog.optionsName).toBe('Crop kinds');
    expect(dialog.optionsCode).toBe('kinds');
    expect(dialog.optionsCodeTaken).toBe(true);
    expect(dialog.valid).toBe(false);
    dialog.optionsCode = 'crop_kinds';
    dialog.onOptionsCodeChange();
    expect(dialog.valid).toBe(true);
  });

  it('sends neither options nor a related list once the type stops being Options', async () => {
    const dialog = await open(FieldAddDialogComponent, { list });
    api.addField.mockReturnValue(new Subject());
    dialog.label = 'Type';
    dialog.onLabelChange();
    dialog.onTypeChange('relation');
    dialog.optionsText = 'Cereal';
    dialog.relationListId = 5;
    dialog.onTypeChange('text');
    expect(dialog.valid).toBe(true);
    dialog.submit();
    const body = api.addField.mock.calls[0][1];
    expect(body.type).toBe('text');
    expect(body.options_list).toBeUndefined();
    expect(body.relation_list_id).toBeUndefined();
  });

  it('starts clean every time it opens: nothing of the previous field stays', async () => {
    const dialog = await open(FieldAddDialogComponent, { list });
    dialog.label = 'Type';
    dialog.onLabelChange();
    dialog.onTypeChange('relation');
    dialog.onTypePicked();
    dialog.setSource('existing');
    dialog.relationListId = 5;
    dialog.optionsText = 'Cereal';
    dialog.optionsOpen = true;
    dialog.codeOpen = true;
    dialog.isRequired = true;

    dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    expect(dialog).toMatchObject({
      label: '',
      code: '',
      codeOpen: false,
      type: null,
      typeOpen: true,
      source: 'new',
      relationListId: null,
      optionsText: '',
      optionsName: '',
      optionsCode: '',
      optionsOpen: false,
      isRequired: false
    });
  });

  it('opens the code box when the label gives no usable code', async () => {
    const dialog = await open(FieldAddDialogComponent, { list });
    dialog.label = 'Name';
    dialog.onLabelChange();
    expect(dialog.codeOpen).toBe(false);
    dialog.label = '2026';
    dialog.onLabelChange();
    expect(dialog.code).toBe('');
    expect(dialog.codeOpen).toBe(true);
  });

  it('shows the required note only on a published list that already has records', async () => {
    const draft = await open(FieldAddDialogComponent, { list });
    expect(draft.requiredNote).toBe(false);
    const live = await open(FieldAddDialogComponent, { list: { ...list, status: 'published', rows: 3 } });
    expect(live.requiredNote).toBe(true);
  });

  it('asks the impact of the chosen type and confirms exactly that number', async () => {
    const dialog = await open(FieldTypeDialogComponent, { field: field(), types: [{ value: 'integer', label: 'Whole number' }] });
    expect(dialog.canSubmit).toBe(false);
    api.fieldImpact.mockReturnValue(of({ rows: 5, affected: 0, message: 'Nothing is lost.' }));
    dialog.type = 'integer';
    dialog.onTypeChange();
    expect(api.fieldImpact).toHaveBeenCalledWith(11, 'type', 'integer');
    api.changeType.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.changeType.mock.calls[0][1]).toMatchObject({ type: 'integer', confirm_affected: 0 });
  });

  it('on a 409 shows the new message and count, and sends the new count on confirm', async () => {
    const dialog = await open(FieldTypeDialogComponent, { field: field(), types: [{ value: 'integer', label: 'Whole number' }] });
    api.fieldImpact.mockReturnValue(of({ rows: 5, affected: 2, message: 'Two records change.' }));
    dialog.type = 'integer';
    dialog.onTypeChange();

    const first = new Subject<unknown>();
    api.changeType.mockReturnValueOnce(first);
    dialog.submit();
    // The shape the back really sends: the count sits under `response`.
    first.error({
      status: 409,
      error: { response: { message: 'Now 3 records change.', affected: 3 }, message: 'Now 3 records change.', status: 409 }
    });
    expect(dialog.reconfirm).toBe(true);
    expect(dialog.error).toBeNull();
    expect(dialog.impact).toMatchObject({ affected: 3, message: 'Now 3 records change.' });
    expect(dialog.visible).toBe(true);

    api.changeType.mockReturnValueOnce(new Subject());
    dialog.submit();
    expect(api.changeType.mock.calls[1][1].confirm_affected).toBe(3);
  });

  it('never offers «relation» as a new type (the back refuses it)', async () => {
    const types = [
      { value: 'text', label: 'Short text' },
      { value: 'integer', label: 'Whole number' },
      { value: 'relation', label: 'Relation to another list' }
    ];
    const dialog = await open(FieldTypeDialogComponent, { field: field(), types });
    expect(dialog.options.map((o: { value: string }) => o.value)).toEqual(['integer']);
  });

  it('asks the parent to read again when the outcome is unknown, and not on a plain 400', async () => {
    const dialog = await open(FieldRenameDialogComponent, { field: field() });
    dialog.label = 'Title';
    const unsettled = jest.fn();
    dialog.unsettled.subscribe(unsettled);

    const refused = new Subject<unknown>();
    api.renameField.mockReturnValueOnce(refused);
    dialog.submit();
    refused.error({ status: 400, error: { message: 'There is already a field with code "title".' } });
    expect(unsettled).not.toHaveBeenCalled();
    expect(dialog.error).toBe('There is already a field with code "title".');

    const dropped = new Subject<unknown>();
    api.renameField.mockReturnValueOnce(dropped);
    dialog.submit();
    dropped.error({ status: 503, error: { message: 'The connection dropped; reload the list in a minute.', status: 503 } });
    expect(unsettled).toHaveBeenCalledTimes(1);
    expect(dialog.error).toBe(`The connection dropped; reload the list in a minute. ${UNKNOWN_OUTCOME}`);
    expect(dialog.visible).toBe(true);
  });

  it('does not write again after it succeeded, until it is opened again', async () => {
    const dialog = await open(FieldRenameDialogComponent, { field: field() });
    dialog.label = 'Title';
    api.renameField.mockClear();
    api.renameField.mockReturnValue(of(field({ label: 'Title' })));
    dialog.submit();
    // Enter during the closing animation.
    dialog.submit();
    expect(api.renameField).toHaveBeenCalledTimes(1);

    dialog.visible = true;
    dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    dialog.label = 'Other';
    dialog.submit();
    expect(api.renameField).toHaveBeenCalledTimes(2);
  });

  it('does not let a list with dependents be deleted', async () => {
    api.deleteImpact.mockReturnValue(of({ rows: 4, dependents: ['varieties'], message: 'Used by varieties.' }));
    const dialog = await open(DeleteListDialogComponent, { list });
    expect(dialog.blocked).toBe(true);
    dialog.submit();
    expect(api.deleteList).not.toHaveBeenCalled();
  });

  it('shows a failed impact and keeps delete disabled', async () => {
    api.fieldImpact.mockReturnValue(new Subject());
    const dialog = await open(FieldDeleteDialogComponent, { field: field() });
    expect(dialog.canSubmit).toBe(false);
    dialog.submit();
    expect(api.deleteField).not.toHaveBeenCalled();
  });

  it('edits only what changed and adds the reason when given', async () => {
    const fields = [field({ code: 'name' }), field({ id: 12, code: 'size', type: 'integer', is_required: 0 })];
    const dialog = await open(RecordDialogComponent, { code: 'crops', fields, record: { id: 4, name: 'Maize', size: 5, is_active: true } });
    expect(dialog.canSubmit).toBe(false);
    dialog.values = { ...dialog.values, size: '' };
    dialog.reason = ' typo ';
    api.updateRecord.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.updateRecord).toHaveBeenCalledWith('crops', 4, { size: null, modification_justification: 'typo' });
  });

  it('lists active related records plus the current one in a relation dropdown', async () => {
    const fields = [field({ code: 'crop', type: 'relation', is_required: 0, relation_code: 'crops', relation_name: 'Crops' })];
    const related = {
      crops: [
        { id: 1, name: 'Maize', is_active: true },
        { id: 2, name: 'Old', is_active: false },
        { id: 3, name: 'Rice', is_active: true }
      ]
    };
    const dialog = await open(RecordDialogComponent, { code: 'varieties', fields, related, record: { id: 9, crop: 2, is_active: true } });
    expect(dialog.options['crop']).toEqual([
      { value: 1, label: 'Maize' },
      { value: 2, label: 'Old' },
      { value: 3, label: 'Rice' }
    ]);
    const fresh = await open(RecordDialogComponent, { code: 'varieties', fields, related, record: null });
    expect(fresh.options['crop'].map((o: { value: number }) => o.value)).toEqual([1, 3]);
  });

  it('deactivates with the reason in the DELETE call, and reactivates with is_active', async () => {
    api.deactivateRecord.mockReturnValue(new Subject());
    const off = await open(RecordStatusDialogComponent, { code: 'crops', record: { id: 4 }, mode: 'deactivate' });
    off.reason = ' duplicate ';
    off.submit();
    expect(api.deactivateRecord).toHaveBeenCalledWith('crops', 4, 'duplicate');

    api.updateRecord.mockReturnValue(new Subject());
    const on = await open(RecordStatusDialogComponent, { code: 'crops', record: { id: 4 }, mode: 'reactivate' });
    on.submit();
    expect(api.updateRecord).toHaveBeenCalledWith('crops', 4, { is_active: true });
  });
});

/** Dialogs that hold typed content: how to type something into each, from a freshly opened one. */
const typing: {
  name: string;
  type: Type<WriteDialogBase<any>>;
  inputs?: Record<string, unknown>;
  dirty: (c: any) => void;
  method: keyof typeof api;
  /** Typed but not enough to send. */ partial?: boolean;
}[] = [
  {
    name: 'new list',
    type: NewListDialogComponent,
    dirty: c => {
      c.name = 'Crops';
      c.onNameChange();
    },
    method: 'createList'
  },
  {
    name: 'add field',
    type: FieldAddDialogComponent,
    inputs: { list },
    dirty: c => {
      c.label = 'Name';
      c.onLabelChange();
      c.type = 'text';
    },
    method: 'addField'
  },
  {
    name: 'add field (only options written)',
    type: FieldAddDialogComponent,
    inputs: { list },
    dirty: c => (c.optionsText = 'Cereal'),
    method: 'addField',
    partial: true
  },
  { name: 'rename field', type: FieldRenameDialogComponent, inputs: { field: field() }, dirty: c => (c.label = 'Title'), method: 'renameField' },
  {
    name: 'rename field (only the code)',
    type: FieldRenameDialogComponent,
    inputs: { field: field() },
    dirty: c => (c.code = 'title'),
    method: 'renameField'
  },
  {
    name: 'create record',
    type: RecordDialogComponent,
    inputs: { code: 'crops', fields: [field()], record: null },
    dirty: c => (c.values = { name: 'Maize' }),
    method: 'createRecord'
  },
  {
    name: 'edit record',
    type: RecordDialogComponent,
    inputs: { code: 'crops', fields: [field()], record: { id: 4, name: 'Maize', is_active: true } },
    dirty: c => (c.values = { name: 'Rice' }),
    method: 'updateRecord'
  },
  {
    name: 'edit record (only the reason)',
    type: RecordDialogComponent,
    inputs: { code: 'crops', fields: [field()], record: { id: 4, name: 'Maize', is_active: true } },
    dirty: c => (c.reason = 'typo'),
    method: 'updateRecord',
    partial: true
  },
  {
    name: 'deactivate record',
    type: RecordStatusDialogComponent,
    inputs: { code: 'crops', record: { id: 4 }, mode: 'deactivate' },
    dirty: c => (c.reason = 'duplicate'),
    method: 'deactivateRecord'
  },
  {
    name: 'reactivate record',
    type: RecordStatusDialogComponent,
    inputs: { code: 'crops', record: { id: 4 }, mode: 'reactivate' },
    dirty: c => (c.reason = 'back in use'),
    method: 'updateRecord'
  }
];

describe('closing a dialog with typed content', () => {
  beforeEach(() => jest.clearAllMocks());

  describe.each(typing)('$name', t => {
    it('closes at once while nothing was typed', async () => {
      const dialog = await open(t.type, t.inputs);
      const changes = jest.fn();
      dialog.visibleChange.subscribe(changes);
      dialog.close();
      expect(dialog.visible).toBe(false);
      expect(dialog.confirmingClose).toBe(false);
      expect(changes).toHaveBeenCalledWith(false);
    });

    it('stays open and asks once something was typed', async () => {
      const dialog = await open(t.type, t.inputs);
      t.dirty(dialog);
      const changes = jest.fn();
      dialog.visibleChange.subscribe(changes);
      // X, Cancel and Escape all arrive as a close request.
      dialog.onVisibleChange(false);
      expect(dialog.visible).toBe(true);
      expect(dialog.confirmingClose).toBe(true);
      expect(changes).not.toHaveBeenCalled();
    });

    it('keeps editing on a second Escape while the question shows, and asks again after that', async () => {
      const dialog = await open(t.type, t.inputs);
      t.dirty(dialog);
      dialog.close();
      dialog.close();
      expect(dialog.confirmingClose).toBe(false);
      expect(dialog.visible).toBe(true);
      dialog.close();
      expect(dialog.confirmingClose).toBe(true);
    });

    it('keeps editing on «Keep editing» and closes on «Discard»', async () => {
      const dialog = await open(t.type, t.inputs);
      t.dirty(dialog);
      dialog.close();
      dialog.keepEditing();
      expect(dialog.confirmingClose).toBe(false);
      expect(dialog.visible).toBe(true);

      dialog.close();
      const changes = jest.fn();
      dialog.visibleChange.subscribe(changes);
      dialog.discard();
      expect(dialog.visible).toBe(false);
      expect(dialog.confirmingClose).toBe(false);
      expect(changes).toHaveBeenCalledWith(false);
    });

    // A write needs more than what was typed in these variants: they only prove what counts as typed.
    const write = (name: string, fn: () => Promise<void>): void => {
      if (!t.partial) it(name, fn);
    };

    write('never asks nor closes while a request is open', async () => {
      const dialog = await open(t.type, t.inputs);
      t.dirty(dialog);
      (api[t.method] as jest.Mock).mockReturnValue(new Subject());
      dialog.submit();
      expect(dialog.saving).toBe(true);
      dialog.close();
      dialog.discard();
      expect(dialog.confirmingClose).toBe(false);
      expect(dialog.visible).toBe(true);
    });

    write('takes the question back when the write starts, and never asks after a success', async () => {
      const dialog = await open(t.type, t.inputs);
      t.dirty(dialog);
      dialog.close();
      expect(dialog.confirmingClose).toBe(true);
      const call = new Subject<unknown>();
      (api[t.method] as jest.Mock).mockReturnValue(call);
      dialog.submit();
      expect(dialog.confirmingClose).toBe(false);
      call.next({ id: 1, name: 'x', label: 'x', is_active: true, type_label: 'x' });
      call.complete();
      expect(dialog.visible).toBe(false);
      // A late Escape during the closing animation must not bring the question back.
      dialog.close();
      expect(dialog.confirmingClose).toBe(false);
    });

    it('starts without the question every time it opens', async () => {
      const dialog = await open(t.type, t.inputs);
      t.dirty(dialog);
      dialog.close();
      expect(dialog.confirmingClose).toBe(true);
      dialog.visible = true;
      dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
      expect(dialog.confirmingClose).toBe(false);
    });
  });

  it.each([
    ['publish', PublishDialogComponent, { list }],
    ['delete list', DeleteListDialogComponent, { list }],
    ['delete field', FieldDeleteDialogComponent, { field: field() }],
    ['change type', FieldTypeDialogComponent, { field: field(), types: [] }]
  ])('%s holds nothing typed: it closes at once', async (_name, type, inputs) => {
    api.fieldImpact.mockReturnValue(of({ rows: 0, affected: 0, message: '' }));
    api.deleteImpact.mockReturnValue(of({ rows: 0, dependents: [], message: '' }));
    const dialog = await open(type as Type<WriteDialogBase<any>>, inputs);
    dialog.close();
    expect(dialog.visible).toBe(false);
    expect(dialog.confirmingClose).toBe(false);
  });

  it('does not count what the dialog opened with as typed: an edit with the same values closes at once', async () => {
    const dialog = await open(RecordDialogComponent, { code: 'crops', fields: [field()], record: { id: 4, name: 'Maize', is_active: true } });
    dialog.values = { name: 'Rice' };
    dialog.values = { name: 'Maize' };
    dialog.reason = '   ';
    dialog.close();
    expect(dialog.visible).toBe(false);
  });
});

describe('the keyboard goes back to what opened the dialog', () => {
  let opener: HTMLButtonElement;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
  });

  afterEach(() => {
    jest.useRealTimers();
    opener.remove();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  /** The dialog opens with focus on a button of the page, then takes the focus for itself, as p-dialog does. */
  async function openFromButton(type: Type<WriteDialogBase<any>>, inputs: Record<string, unknown> = {}): Promise<any> {
    const dialog = await open(type, inputs);
    const inside = document.createElement('input');
    document.body.appendChild(inside);
    inside.focus();
    (dialog as any).__inside = inside;
    return dialog;
  }

  it('after Cancel', async () => {
    const dialog = await openFromButton(PublishDialogComponent, { list });
    expect(document.activeElement).not.toBe(opener);
    dialog.close();
    jest.runAllTimers();
    expect(document.activeElement).toBe(opener);
    dialog.__inside.remove();
  });

  it('after «Discard»', async () => {
    const dialog = await openFromButton(NewListDialogComponent);
    dialog.name = 'Crops';
    dialog.close();
    jest.runAllTimers();
    // Still open: the focus has not been given back yet.
    expect(document.activeElement).not.toBe(opener);
    dialog.discard();
    jest.runAllTimers();
    expect(document.activeElement).toBe(opener);
    dialog.__inside.remove();
  });

  it('after a successful write', async () => {
    const dialog = await openFromButton(PublishDialogComponent, { list });
    api.publish.mockReturnValue(of({ id: 7 }));
    dialog.submit();
    jest.runAllTimers();
    expect(document.activeElement).toBe(opener);
    dialog.__inside.remove();
  });

  it('only once: a second close does not steal the focus again', async () => {
    const dialog = await openFromButton(PublishDialogComponent, { list });
    dialog.close();
    jest.runAllTimers();
    const other = document.createElement('button');
    document.body.appendChild(other);
    other.focus();
    dialog.close();
    jest.runAllTimers();
    expect(document.activeElement).toBe(other);
    other.remove();
    dialog.__inside.remove();
  });

  it('is skipped when the opener is gone from the page, and when nothing had the focus', async () => {
    const dialog = await openFromButton(PublishDialogComponent, { list });
    opener.remove();
    expect(() => {
      dialog.close();
      jest.runAllTimers();
    }).not.toThrow();
    dialog.__inside.remove();

    (document.activeElement as HTMLElement).blur();
    const bare = await open(PublishDialogComponent, { list });
    const spy = jest.spyOn(document.body, 'focus');
    bare.close();
    jest.runAllTimers();
    expect(spy).not.toHaveBeenCalled();
  });

  it('remembers the opener of each opening, not the first one', async () => {
    const dialog = await openFromButton(PublishDialogComponent, { list });
    dialog.__inside.remove();
    dialog.close();
    jest.runAllTimers();
    const second = document.createElement('button');
    document.body.appendChild(second);
    second.focus();
    dialog.visible = true;
    dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    opener.focus();
    dialog.close();
    jest.runAllTimers();
    expect(document.activeElement).toBe(second);
    second.remove();
  });
});

describe('new list: the owner', () => {
  const roles = [
    { id: 1, acronym: 'CL', description: 'Control lists' },
    { id: 2, acronym: 'GL', description: 'Glossary' }
  ];

  beforeEach(() => jest.clearAllMocks());

  it('is required when the user holds several roles: no owner, no Create', async () => {
    const dialog = await open(NewListDialogComponent, { owners: roles });
    dialog.name = 'Crops';
    dialog.onNameChange();
    expect(dialog.ownerId).toBeNull();
    expect(dialog.ownerMissing).toBe(true);
    expect(dialog.valid).toBe(false);
    dialog.submit();
    expect(api.createList).not.toHaveBeenCalled();

    dialog.ownerId = 2;
    expect(dialog.ownerMissing).toBe(false);
    expect(dialog.valid).toBe(true);
    api.createList.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.createList).toHaveBeenCalledWith({ code: 'crops', name: 'Crops', owner_role_id: 2 });
  });

  it('is not asked with one role (it is preselected) nor when the roles could not be read', async () => {
    const one = await open(NewListDialogComponent, { owners: [roles[0]] });
    one.name = 'Crops';
    one.onNameChange();
    expect(one.ownerMissing).toBe(false);
    expect(one.valid).toBe(true);
    expect(one.singleOwner).toEqual(roles[0]);

    const none = await open(NewListDialogComponent, { owners: [] });
    none.name = 'Crops';
    none.onNameChange();
    expect(none.valid).toBe(true);
  });

  it('forgets the owner of the previous opening', async () => {
    const dialog = await open(NewListDialogComponent, { owners: roles });
    dialog.ownerId = 2;
    dialog.visible = true;
    dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    expect(dialog.ownerId).toBeNull();
  });
});

describe('codes the back reserves', () => {
  beforeEach(() => jest.clearAllMocks());

  it('new list: suggests admin_list for «Admin», and refuses a reserved code typed by hand', async () => {
    const dialog = await open(NewListDialogComponent, { owners: [] });
    dialog.name = 'Admin';
    dialog.onNameChange();
    expect(dialog.code).toBe('admin_list');
    expect(dialog.valid).toBe(true);

    dialog.code = 'admin';
    dialog.onCodeChange();
    expect(dialog.codeError).toBe('"admin" is a reserved word. Choose another code.');
    expect(dialog.codeInvalid).toBe(true);
    expect(dialog.valid).toBe(false);
    dialog.submit();
    expect(api.createList).not.toHaveBeenCalled();

    dialog.code = 'select';
    dialog.onCodeChange();
    expect(dialog.codeError).toBe('"select" is a reserved word. Choose another code.');
  });

  it('add field: suggests date_field for «Date» and keeps the code box closed', async () => {
    const dialog = await open(FieldAddDialogComponent, { list });
    dialog.label = 'Date';
    dialog.onLabelChange();
    dialog.type = 'date';
    expect(dialog.code).toBe('date_field');
    expect(dialog.codeOpen).toBe(false);
    expect(dialog.valid).toBe(true);
  });

  it('add field: refuses a reserved code, and opens the code box by itself when the label comes after it', async () => {
    const dialog = await open(FieldAddDialogComponent, { list });
    dialog.label = 'Order';
    dialog.onLabelChange();
    dialog.type = 'text';
    dialog.code = 'order';
    dialog.onCodeChange();
    expect(dialog.codeError).toBe('"order" is a reserved word. Choose another code.');
    expect(dialog.valid).toBe(false);

    // The code was written by hand and is still reserved: a new label must not hide that.
    dialog.codeOpen = false;
    dialog.label = 'Order of planting';
    dialog.onLabelChange();
    expect(dialog.code).toBe('order');
    expect(dialog.codeOpen).toBe(true);

    dialog.code = 'id';
    dialog.onCodeChange();
    expect(dialog.codeError).toBe('"id" is a reserved word. Choose another code.');
    dialog.code = 'planting_order';
    dialog.onCodeChange();
    expect(dialog.valid).toBe(true);
  });

  it('add field: the options list code cannot be a reserved list code either', async () => {
    const dialog = await open(FieldAddDialogComponent, { list, takenCodes: [] });
    dialog.label = 'Type';
    dialog.onLabelChange();
    dialog.onTypeChange('relation');
    dialog.optionsText = 'Cereal';
    expect(dialog.valid).toBe(true);
    dialog.optionsCode = 'lists';
    dialog.onOptionsCodeChange();
    expect(dialog.optionsCodeError).toBe('"lists" is a reserved word. Choose another code.');
    expect(dialog.optionsCodeInvalid).toBe(true);
    expect(dialog.valid).toBe(false);
    dialog.optionsCode = 'crops_type';
    dialog.onOptionsCodeChange();
    expect(dialog.valid).toBe(true);
  });

  it('rename field: refuses a reserved code', async () => {
    const dialog = await open(FieldRenameDialogComponent, { field: field() });
    dialog.code = 'where';
    expect(dialog.codeError).toBe('"where" is a reserved word. Choose another code.');
    expect(dialog.valid).toBe(false);
    dialog.submit();
    expect(api.renameField).not.toHaveBeenCalled();
    dialog.code = 'title';
    expect(dialog.valid).toBe(true);
  });
});

describe('add field: rules the back refuses', () => {
  beforeEach(() => jest.clearAllMocks());

  async function ready(inputs: Record<string, unknown> = { list }): Promise<any> {
    const dialog = await open(FieldAddDialogComponent, inputs);
    dialog.label = 'Notes';
    dialog.onLabelChange();
    return dialog;
  }

  it('long text: Unique and Filterable switch off and cannot travel', async () => {
    const dialog = await ready();
    dialog.onTypeChange('text');
    dialog.isUnique = true;
    dialog.isIndexed = true;
    expect(dialog.longText).toBe(false);

    dialog.onTypeChange('long_text');
    expect(dialog.longText).toBe(true);
    expect(dialog.isUnique).toBe(false);
    expect(dialog.isIndexed).toBe(false);

    // Even if the switches are forced back on, the body says no.
    dialog.isUnique = true;
    dialog.isIndexed = true;
    api.addField.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.addField.mock.calls[0][1]).toMatchObject({ type: 'long_text', is_unique: false, is_indexed: false });
  });

  it('other types keep their Unique and Filterable switches', async () => {
    const dialog = await ready();
    dialog.onTypeChange('text');
    dialog.isUnique = true;
    dialog.isIndexed = true;
    api.addField.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.addField.mock.calls[0][1]).toMatchObject({ is_unique: true, is_indexed: true });
  });

  it('Required cannot be asked on a published list that already has records', async () => {
    const dialog = await ready({ list: { ...list, status: 'published', rows: 3 } });
    dialog.onTypeChange('text');
    expect(dialog.requiredNote).toBe(true);
    dialog.isRequired = true;
    api.addField.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.addField.mock.calls[0][1].is_required).toBe(false);
  });

  it('Required is allowed on a draft and on a published list with no records', async () => {
    for (const l of [list, { ...list, status: 'published', rows: 0 }]) {
      api.addField.mockClear();
      const dialog = await ready({ list: l });
      dialog.onTypeChange('text');
      dialog.isRequired = true;
      api.addField.mockReturnValue(new Subject());
      dialog.submit();
      expect(api.addField.mock.calls[0][1].is_required).toBe(true);
    }
  });
});

describe('record dialog: required fields, decimals, options', () => {
  beforeEach(() => jest.clearAllMocks());

  const required = field({ code: 'name', label: 'Name', is_required: 1 });
  const share = field({ id: 12, code: 'share', label: 'Share', type: 'decimal', is_required: 0 });

  it('create: the button waits for every required field', async () => {
    const dialog = await open(RecordDialogComponent, { code: 'crops', fields: [required, share], record: null });
    expect(dialog.missing).toEqual(['Name']);
    expect(dialog.canSubmit).toBe(false);
    api.createRecord.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.createRecord).not.toHaveBeenCalled();

    dialog.values = { ...dialog.values, name: '   ' };
    expect(dialog.canSubmit).toBe(false);
    dialog.values = { ...dialog.values, name: 'Maize' };
    expect(dialog.missing).toEqual([]);
    expect(dialog.canSubmit).toBe(true);
    dialog.submit();
    expect(api.createRecord).toHaveBeenCalledTimes(1);
  });

  it('edit: clearing a required field disables the button even though something changed', async () => {
    const dialog = await open(RecordDialogComponent, {
      code: 'crops',
      fields: [required, share],
      record: { id: 4, name: 'Maize', share: 1, is_active: true }
    });
    dialog.values = { ...dialog.values, share: '2' };
    expect(dialog.canSubmit).toBe(true);
    dialog.values = { ...dialog.values, name: '' };
    expect(dialog.hasChanges).toBe(true);
    expect(dialog.missing).toEqual(['Name']);
    expect(dialog.canSubmit).toBe(false);
  });

  it('a required switch or a «0» is a value, not a gap', async () => {
    const flag = field({ id: 13, code: 'flag', label: 'Flag', type: 'boolean', is_required: 1 });
    const count = field({ id: 14, code: 'count', label: 'Count', type: 'integer', is_required: 1 });
    const dialog = await open(RecordDialogComponent, { code: 'crops', fields: [flag, count], record: null });
    expect(dialog.missing).toEqual(['Count']);
    dialog.values = { ...dialog.values, count: '0' };
    expect(dialog.missing).toEqual([]);
  });

  it('sends a decimal typed with a comma as a number with a dot', async () => {
    const dialog = await open(RecordDialogComponent, { code: 'crops', fields: [required, share], record: null });
    dialog.values = { name: 'Maize', share: '3,5' };
    api.createRecord.mockReturnValue(new Subject());
    dialog.submit();
    expect(api.createRecord.mock.calls[0][1]).toMatchObject({ name: 'Maize', share: 3.5 });

    const edit = await open(RecordDialogComponent, {
      code: 'crops',
      fields: [required, share],
      record: { id: 4, name: 'Maize', share: 1, is_active: true }
    });
    edit.values = { ...edit.values, share: '0,25' };
    api.updateRecord.mockReturnValue(new Subject());
    edit.submit();
    expect(api.updateRecord).toHaveBeenCalledWith('crops', 4, { share: 0.25 });
  });

  describe('a required Options field', () => {
    const crop = (over: Partial<FieldRow> = {}) =>
      field({ id: 20, code: 'crop', label: 'Crop', type: 'relation', is_required: 1, relation_code: 'crops', relation_name: 'Crops', ...over });

    it('says so when its list has no active record, and the button waits', async () => {
      const dialog = await open(RecordDialogComponent, {
        code: 'varieties',
        fields: [crop()],
        related: { crops: [{ id: 2, name: 'Old', is_active: false }] },
        record: null
      });
      expect(dialog.noOptions(crop())).toBe(true);
      expect(dialog.canSubmit).toBe(false);
    });

    it('is quiet when an active record exists, when the field is optional, and when the list could not be read', async () => {
      const active = await open(RecordDialogComponent, {
        code: 'varieties',
        fields: [crop()],
        related: { crops: [{ id: 1, name: 'Maize', is_active: true }] },
        record: null
      });
      expect(active.noOptions(crop())).toBe(false);

      const optional = await open(RecordDialogComponent, {
        code: 'varieties',
        fields: [crop({ is_required: 0 })],
        related: { crops: [] },
        record: null
      });
      expect(optional.noOptions(crop({ is_required: 0 }))).toBe(false);

      const failed = await open(RecordDialogComponent, { code: 'varieties', fields: [crop()], related: { crops: null }, record: null });
      expect(failed.relationFailed(crop())).toBe(true);
      expect(failed.noOptions(crop())).toBe(false);
    });

    it('does not complain when the current value is a deactivated record (edit)', async () => {
      const dialog = await open(RecordDialogComponent, {
        code: 'varieties',
        fields: [crop()],
        related: { crops: [{ id: 2, name: 'Old', is_active: false }] },
        record: { id: 9, crop: 2, is_active: true }
      });
      expect(dialog.noOptions(crop())).toBe(false);
    });
  });
});

describe('impact that could not be read: try again', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delete list: reads it again and clears the error', async () => {
    api.deleteImpact.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    const dialog = await open(DeleteListDialogComponent, { list });
    expect(dialog.impactError).toBeTruthy();
    expect(dialog.canSubmit).toBe(false);

    api.deleteImpact.mockReturnValueOnce(of({ rows: 2, dependents: [], message: 'Two records go.' }));
    dialog.retryImpact();
    expect(api.deleteImpact).toHaveBeenCalledTimes(2);
    expect(dialog.impactError).toBeNull();
    expect(dialog.impact).toMatchObject({ rows: 2 });
    expect(dialog.canSubmit).toBe(true);
  });

  it('delete list: a second failure shows the error again', async () => {
    api.deleteImpact.mockReturnValue(throwError(() => ({ status: 500 })));
    const dialog = await open(DeleteListDialogComponent, { list });
    dialog.retryImpact();
    expect(api.deleteImpact).toHaveBeenCalledTimes(2);
    expect(dialog.impactError).toBeTruthy();
    expect(dialog.impactLoading).toBe(false);
  });

  it('change type: asks the impact of the same type again', async () => {
    const types = [{ value: 'integer', label: 'Whole number' }];
    const dialog = await open(FieldTypeDialogComponent, { field: field(), types });
    api.fieldImpact.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    dialog.type = 'integer';
    dialog.onTypeChange();
    expect(dialog.impactError).toBeTruthy();

    api.fieldImpact.mockReturnValueOnce(of({ rows: 1, affected: 1, message: 'One record changes.' }));
    dialog.retryImpact();
    expect(api.fieldImpact).toHaveBeenLastCalledWith(11, 'type', 'integer');
    expect(dialog.impactError).toBeNull();
    expect(dialog.canSubmit).toBe(true);
  });

  it('delete field: reads it again', async () => {
    api.fieldImpact.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    const dialog = await open(FieldDeleteDialogComponent, { field: field() });
    expect(dialog.canSubmit).toBe(false);
    api.fieldImpact.mockReturnValueOnce(of({ rows: 0, affected: 0, message: 'Nothing is lost.' }));
    dialog.retryImpact();
    expect(dialog.impactError).toBeNull();
    expect(dialog.canSubmit).toBe(true);
  });
});

describe('a write that never answers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unlocks the dialog, says the server is slow, and asks the parent to read the list again', async () => {
    const dialog = await open(FieldRenameDialogComponent, { field: field() });
    dialog.label = 'Title';
    const unsettled = jest.fn();
    dialog.unsettled.subscribe(unsettled);
    const call = new Subject<unknown>();
    api.renameField.mockReturnValueOnce(call);
    dialog.submit();
    expect(dialog.saving).toBe(true);
    call.error(new TimeoutError());
    expect(dialog.saving).toBe(false);
    expect(dialog.error).toBe(`The server is taking too long to answer. ${UNKNOWN_OUTCOME}`);
    expect(unsettled).toHaveBeenCalledTimes(1);
    // Closing works again (dirty: it asks, then discards).
    dialog.close();
    dialog.discard();
    expect(dialog.visible).toBe(false);
  });

  it('retries with the same request_id', async () => {
    const dialog = await open(FieldRenameDialogComponent, { field: field() });
    dialog.label = 'Title';
    api.renameField.mockReturnValueOnce(throwError(() => new TimeoutError())).mockReturnValueOnce(new Subject());
    dialog.submit();
    dialog.submit();
    expect(api.renameField.mock.calls[1][1].request_id).toBe(api.renameField.mock.calls[0][1].request_id);
  });
});

import { Component, Input, NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Subject } from 'rxjs';
import { FieldRow, ListRecord } from '../../models/control-lists.models';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { DiscardBarComponent } from '../discard-bar/discard-bar.component';
import { RecordsBulkDialogComponent } from './records-bulk-dialog.component';

@Component({ selector: 'p-dialog', template: '<div class="dlg" *ngIf="visible"><ng-content></ng-content></div>' })
class DialogStub {
  @Input() visible = false;
}

const api = { createRecords: jest.fn() };
const toast = { add: jest.fn() };

const field = (code: string, label: string, type: string, over: Partial<FieldRow> = {}): FieldRow =>
  ({
    id: code.length,
    list_id: 7,
    code,
    label,
    type,
    is_required: 0,
    is_unique: 0,
    is_indexed: 0,
    relation_list_id: null,
    position: 1,
    status: 'published',
    type_label: type,
    relation_name: null,
    relation_code: null,
    ...over
  }) as FieldRow;

const fields = [
  field('name', 'Name', 'text', { is_required: 1, is_unique: 1 }),
  field('kind', 'Type', 'relation', { relation_name: 'Crop types', relation_code: 'crop_types' })
];
const related: Record<string, ListRecord[] | null> = {
  crop_types: [
    { id: 1, name: 'Cereal', is_active: true },
    { id: 2, name: 'Root', is_active: true },
    { id: 3, name: 'Legume', is_active: true }
  ]
};

async function draw(): Promise<ComponentFixture<RecordsBulkDialogComponent>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    declarations: [RecordsBulkDialogComponent, DialogStub, DiscardBarComponent],
    imports: [FormsModule, ButtonModule, InputTextareaModule, NoopAnimationsModule],
    providers: [
      { provide: ControlListsApiService, useValue: api },
      { provide: MessageService, useValue: toast }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  }).compileComponents();
  const f = TestBed.createComponent(RecordsBulkDialogComponent);
  Object.assign(f.componentInstance, { code: 'crops', fields, related, visible: true });
  f.componentInstance.ngOnChanges({ visible: new SimpleChange(false, true, true) });
  await settle(f);
  return f;
}

async function settle(f: ComponentFixture<unknown>): Promise<void> {
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
}

const q = <E extends HTMLElement = HTMLElement>(f: ComponentFixture<unknown>, s: string): E => f.nativeElement.querySelector(s);
const all = (f: ComponentFixture<unknown>, s: string): HTMLElement[] => Array.from(f.nativeElement.querySelectorAll(s));
const text = (f: ComponentFixture<unknown>): string => (f.nativeElement.textContent as string).replace(/\s+/g, ' ');
const submit = (f: ComponentFixture<unknown>): HTMLButtonElement => q<HTMLButtonElement>(f, 'button[type=submit]');
const button = (f: ComponentFixture<unknown>, label: string): HTMLButtonElement =>
  all(f, 'button').find(b => b.textContent?.includes(label)) as HTMLButtonElement;

async function paste(f: ComponentFixture<unknown>, value: string): Promise<void> {
  const box = q<HTMLTextAreaElement>(f, '#cl-rb-text');
  box.value = value;
  box.dispatchEvent(new Event('input'));
  await settle(f);
}

describe('RecordsBulkDialogComponent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens empty, with the fields in column order, an example built for the first field, and «Add records» off', async () => {
    const f = await draw();
    const box = q<HTMLTextAreaElement>(f, '#cl-rb-text');
    expect(box.value).toBe('');
    expect(box.getAttribute('spellcheck')).toBe('false');
    expect(box.getAttribute('placeholder')).toBe('Maize\nRice\nCassava');
    expect(q(f, 'label[for=cl-rb-text]').textContent).toContain('Records');
    const chips = all(f, '.rb-fields__item').map(li => [
      li.querySelector('.rb-fields__n')?.textContent?.trim(),
      li.querySelector('.rb-fields__name')?.textContent?.trim(),
      li.querySelector('.rb-fields__req')?.textContent?.trim() ?? null
    ]);
    expect(chips).toEqual([
      ['1', 'Name', ', required'],
      ['2', 'Type', null]
    ]);
    expect(submit(f).textContent).toContain('Add records');
    expect(submit(f).disabled).toBe(true);
    expect(q(f, '[aria-live=polite]')).not.toBeNull();
  });

  it('counts the rows live and names the button after them', async () => {
    const f = await draw();
    await paste(f, 'Maize\tCereal\nRice\tRoot');
    expect(text(f)).toContain('2 records ready');
    expect(submit(f).textContent).toContain('Add 2 records');
    expect(submit(f).disabled).toBe(false);
    await paste(f, 'Maize\tCereal');
    expect(text(f)).toContain('1 record ready');
    expect(submit(f).textContent).toContain('Add 1 record');
  });

  it('marks each problem on its cell with the words, keeps the button off and says why', async () => {
    const f = await draw();
    await paste(f, 'Name\tType\nMaize\tCerial\nRice\tRoot\nmaize\tRoot');
    expect(text(f)).toContain('The first line is the header and was left out.');
    expect(text(f)).toContain('1 ready · 2 with problems');
    const bad = all(f, '.rb-cell--bad');
    expect(bad.length).toBe(2);
    expect(bad[0].textContent).toContain('No option “Cerial” in Crop types');
    expect(bad[1].textContent).toContain('Repeated in row 1');
    expect(bad.every(cell => cell.querySelector('.pi-times-circle'))).toBe(true);
    // The same problems, with the label of their field, under each row: what a phone shows when the cell is off-screen.
    expect(all(f, '.rb-cellproblems').map(tr => tr.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Type: No option “Cerial” in Crop types',
      'Name: Repeated in row 1'
    ]);
    expect(submit(f).disabled).toBe(true);
    expect(text(f)).toContain('Fix the rows with problems to continue.');
    expect(submit(f).getAttribute('aria-describedby')).toBe('cl-rb-blocked');

    const only = q<HTMLInputElement>(f, '.rb-only input');
    expect(q(f, '.rb-only').textContent).toContain('Show only rows with problems');
    only.click();
    await settle(f);
    expect(all(f, '.rb-table tbody tr:not(.rb-cellproblems)').map(tr => tr.querySelector('th')?.textContent?.trim())).toEqual([
      expect.stringContaining('1'),
      expect.stringContaining('3')
    ]);
  });

  it('refuses more than 500 rows, showing only the summary and the limit: no table, no toggle', async () => {
    const f = await draw();
    await paste(f, Array.from({ length: 612 }, (_, i) => `Crop ${i + 1}\tCereal`).join('\n'));
    expect(text(f)).toContain('You can add up to 500 records at a time; this has 612.');
    // Nothing is «ready» over the limit, and the button does not promise a number it cannot send.
    expect(text(f)).toContain('612 records pasted');
    expect(text(f)).not.toContain('ready');
    expect(text(f)).toContain('Add them in smaller groups.');
    expect(text(f)).not.toContain('Add 612 records');
    expect(submit(f).disabled).toBe(true);
    expect(q(f, '.rb-table')).toBeNull();
    expect(q(f, '.rb-only')).toBeNull();
  });

  it('a paste of 20,000 lines draws no row at all', async () => {
    const f = await draw();
    await paste(f, Array.from({ length: 20_000 }, (_, i) => (i % 2 ? `Crop ${i}\tCerial` : `Crop ${i}\tCereal`)).join('\n'));
    expect(text(f)).toContain('this has 20000.');
    expect(all(f, 'tr').length).toBe(0);
    expect(text(f)).not.toContain('Fix the rows with problems to continue.');
    expect(submit(f).disabled).toBe(true);
  });

  it('marks a unique value the list already holds, from the records the tab passes in', async () => {
    const f = await draw();
    f.componentInstance.existing = [{ id: 5, name: 'Maize', is_active: false }];
    await paste(f, 'maize\tCereal\nRice\tRoot');
    const bad = all(f, '.rb-cell--bad');
    expect(bad.length).toBe(1);
    expect(bad[0].textContent).toContain('Already in the list');
    expect(submit(f).disabled).toBe(true);
  });

  it('sends one request for a double click, with one record per row keyed by field code', async () => {
    const f = await draw();
    api.createRecords.mockReturnValue(new Subject());
    await paste(f, 'Maize\tCereal\nRice\t2\nCassava');
    submit(f).click();
    submit(f).click();
    expect(api.createRecords).toHaveBeenCalledTimes(1);
    const [code, body] = api.createRecords.mock.calls[0];
    expect(code).toBe('crops');
    expect(body).toEqual({
      request_id: expect.any(String),
      records: [{ name: 'Maize', kind: 1 }, { name: 'Rice', kind: 2 }, { name: 'Cassava' }]
    });
    await settle(f);
    expect(submit(f).disabled).toBe(true);
    expect(submit(f).textContent).toContain('Adding…');
  });

  it('keeps the dialog open with the message of the back on a 400', async () => {
    const f = await draw();
    const answer = new Subject<{ created: number }>();
    api.createRecords.mockReturnValue(answer);
    await paste(f, 'Maize\tCereal');
    f.componentInstance.submit();
    answer.error({ status: 400, error: { message: 'Row 1: there is no record 99 in "Crop types".' } });
    await settle(f);
    expect(f.componentInstance.visible).toBe(true);
    expect(q(f, '.cl-error').textContent).toContain('Row 1: there is no record 99 in "Crop types".');
    expect(submit(f).disabled).toBe(false);
  });

  it('asks before dropping a paste on Cancel, and closes at once when the box is blank', async () => {
    const f = await draw();
    await paste(f, '  \n ');
    button(f, 'Cancel').click();
    await settle(f);
    expect(f.componentInstance.visible).toBe(false);

    const g = await draw();
    await paste(g, 'Maize');
    button(g, 'Cancel').click();
    await settle(g);
    expect(q(g, 'app-cl-discard-bar')).not.toBeNull();
    expect(g.componentInstance.visible).toBe(true);
  });

  it('emits done once and says how many records were added', async () => {
    const f = await draw();
    const answer = new Subject<{ created: number }>();
    api.createRecords.mockReturnValue(answer);
    const done = jest.fn();
    f.componentInstance.done.subscribe(done);
    await paste(f, 'Maize\tCereal\nRice\tRoot');
    f.componentInstance.submit();
    answer.next({ created: 2 });
    answer.complete();
    f.componentInstance.submit();
    expect(done).toHaveBeenCalledTimes(1);
    expect(api.createRecords).toHaveBeenCalledTimes(1);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: '2 records added' }));
    expect(f.componentInstance.visible).toBe(false);
  });

  it('says «1 record added» for one', async () => {
    const f = await draw();
    const answer = new Subject<{ created: number }>();
    api.createRecords.mockReturnValue(answer);
    await paste(f, 'Maize\tCereal');
    f.componentInstance.submit();
    answer.next({ created: 1 });
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ summary: '1 record added' }));
  });

  it('with problems or over a limit the button carries no count', async () => {
    const f = await draw();
    await paste(f, 'Maize\tCerial\nRice\tRoot');
    expect(submit(f).textContent?.trim()).toBe('Add records');
  });

  it('shows what will be saved, with the pasted text under it when it reads differently', async () => {
    const f = await draw();
    await paste(f, 'Maize\t3\nRice\troot');
    const cells = all(f, '.rb-table tbody td');
    expect(cells[1].querySelector('.rb-value')?.textContent?.trim()).toBe('Legume');
    expect(cells[1].querySelector('.rb-from')?.textContent?.trim()).toBe('from “3”');
    // Only case differs: no second line.
    expect(cells[3].querySelector('.rb-value')?.textContent?.trim()).toBe('Root');
    expect(cells[3].querySelector('.rb-from')).toBeNull();
  });

  it('the header box follows the detection until the person sets it, and starts over when the box is emptied', async () => {
    const f = await draw();
    expect(q(f, '.rb-header')).toBeNull();
    await paste(f, 'Name\tType\nMaize\tCereal');
    const box = q<HTMLInputElement>(f, '.rb-header input');
    expect(box.checked).toBe(true);
    expect(text(f)).toContain('The first line is the header and was left out.');
    expect(text(f)).toContain('1 record ready');

    box.click();
    await settle(f);
    expect(q<HTMLInputElement>(f, '.rb-header input').checked).toBe(false);
    // The line is a record now: «Type» is no option of Crop types.
    expect(text(f)).toContain('1 ready · 1 with problems');
    expect(text(f)).toContain('No option “Type” in Crop types');

    // Still the person's choice while the text changes.
    await paste(f, 'Name\tType\nMaize\tCereal\nRice\tRoot');
    expect(q<HTMLInputElement>(f, '.rb-header input').checked).toBe(false);

    await paste(f, '');
    await paste(f, 'Type\tName\nCereal\tMaize');
    expect(q<HTMLInputElement>(f, '.rb-header input').checked).toBe(true);
    expect(text(f)).toContain('The first line is the header: its columns were matched by name.');
  });

  it('reads the paste again when the records of the list change under the open dialog', async () => {
    const f = await draw();
    await paste(f, 'Maize\tCereal');
    expect(submit(f).disabled).toBe(false);
    const c = f.componentInstance;
    c.existing = [{ id: 9, name: 'Maize', is_active: true }];
    c.ngOnChanges({ existing: new SimpleChange([], c.existing, false) });
    await settle(f);
    expect(text(f)).toContain('Already in the list');
    expect(submit(f).disabled).toBe(true);
  });

  it('too much text for one request: only the summary and the limit, no rows', async () => {
    const f = await draw();
    Object.assign(f.componentInstance, { fields: [field('notes', 'Notes', 'long_text')] });
    await paste(f, Array.from({ length: 34 }, () => 'x'.repeat(60_000)).join('\n'));
    expect(text(f)).toContain('These records carry too much text for one request (the limit is 2 MB). Add them in smaller groups.');
    expect(q(f, '.rb-table')).toBeNull();
    expect(submit(f).disabled).toBe(true);
  });

  it('after an unknown outcome, a paste that changed goes with a new id, the same paste with the same id', async () => {
    const f = await draw();
    const c = f.componentInstance;
    const fail = (): void => {
      const answer = new Subject<{ created: number }>();
      api.createRecords.mockReturnValueOnce(answer);
      c.submit();
      answer.error({ status: 504 });
    };
    await paste(f, 'Maize\tCereal\nRice\tRoot\nBeans\tLegume');
    fail();
    fail();
    await paste(f, 'Maize\tCereal\nRice\tRoot\nBeans\tLegume\nCassava\tRoot');
    fail();
    const ids = api.createRecords.mock.calls.map(call => call[1].request_id);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
    expect(api.createRecords.mock.calls[2][1].records.length).toBe(4);
  });

  it('shows the 409 of an id already used for other records and stays open', async () => {
    const f = await draw();
    const answer = new Subject<{ created: number }>();
    api.createRecords.mockReturnValue(answer);
    await paste(f, 'Maize\tCereal');
    f.componentInstance.submit();
    answer.error({ status: 409, error: { message: 'That operation id was already used for other records. Start again from the screen.' } });
    await settle(f);
    expect(q(f, '.cl-error').textContent).toContain('That operation id was already used for other records.');
    expect(f.componentInstance.visible).toBe(true);
  });

  it('names the columns that hold problems, in column order and once each, plus the row length', async () => {
    const f = await draw();
    await paste(f, 'Maize\tCerial\n\tRoot\nRice\tCerial\nBeans\tRoot\textra');
    expect(text(f)).toContain('Problems in: Name, Type, row length.');
    await paste(f, 'Maize\tCerial');
    expect(text(f)).toContain('Problems in: Type.');
    await paste(f, 'Maize\tCereal');
    expect(text(f)).not.toContain('Problems in');
  });

  it('builds the example from the first three active records of the list, as they would be pasted', async () => {
    const f = await draw();
    const c = f.componentInstance;
    c.existing = [
      { id: 1, name: 'Wheat', kind: 1, is_active: false },
      { id: 2, name: 'Maize', kind: 1, is_active: true },
      { id: 3, name: 'Cassava', kind: 2, is_active: true }
    ];
    c.visible = true;
    c.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    // Only Name: Type is optional and comes after the last required field. The inactive Wheat is left out.
    expect(c.placeholder).toBe('Maize\nCassava');
  });
});

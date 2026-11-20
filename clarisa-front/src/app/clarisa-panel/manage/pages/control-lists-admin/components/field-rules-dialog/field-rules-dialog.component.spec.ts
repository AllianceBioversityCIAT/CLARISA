import { Component, Input, NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { Subject } from 'rxjs';
import { FieldRow } from '../../models/control-lists.models';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { DiscardBarComponent } from '../discard-bar/discard-bar.component';
import { FieldRulesDialogComponent } from './field-rules-dialog.component';

@Component({ selector: 'p-dialog', template: '<div class="dlg" *ngIf="visible"><ng-content></ng-content></div>' })
class DialogStub {
  @Input() visible = false;
}

const api = { setFieldRules: jest.fn() };
const toast = { add: jest.fn() };

const field = (over: Partial<FieldRow> = {}): FieldRow =>
  ({
    id: 11,
    list_id: 7,
    code: 'name',
    label: 'Name',
    type: 'text',
    is_required: 0,
    is_unique: 0,
    is_indexed: 1,
    relation_list_id: null,
    position: 1,
    status: 'published',
    type_label: 'Short text',
    relation_name: null,
    relation_code: null,
    ...over
  }) as FieldRow;

async function draw(over: Partial<FieldRow> = {}, published = true): Promise<ComponentFixture<FieldRulesDialogComponent>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    declarations: [FieldRulesDialogComponent, DialogStub, DiscardBarComponent],
    imports: [FormsModule, ButtonModule, InputSwitchModule, NoopAnimationsModule],
    providers: [
      { provide: ControlListsApiService, useValue: api },
      { provide: MessageService, useValue: toast }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  }).compileComponents();
  const f = TestBed.createComponent(FieldRulesDialogComponent);
  Object.assign(f.componentInstance, { field: field(over), published, visible: true });
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
const text = (f: ComponentFixture<unknown>): string => (f.nativeElement.textContent as string).replace(/\s+/g, ' ');
const button = (f: ComponentFixture<unknown>, label: string): HTMLButtonElement =>
  Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b =>
    b.textContent?.includes(label)
  ) as HTMLButtonElement;
const input = (f: ComponentFixture<unknown>, id: string): HTMLInputElement => q<HTMLInputElement>(f, '#' + id);

/** Flips a switch the way a click does. */
async function flip(f: ComponentFixture<unknown>, id: string): Promise<void> {
  (input(f, id).closest('.p-inputswitch') as HTMLElement).click();
  await settle(f);
}

const FILTER_WARNING = 'Applications that filter by this field with ?name=… will get an error after this change.';

describe('FieldRulesDialogComponent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens with the stored rules under the field label, with the words of «Add field», and Save off', async () => {
    const f = await draw({ is_required: 1, is_unique: 0, is_indexed: 1 });
    expect(f.componentInstance.header).toBe('Rules of “Name”');
    expect(input(f, 'cl-fr-req').checked).toBe(true);
    expect(input(f, 'cl-fr-uniq').checked).toBe(false);
    expect(input(f, 'cl-fr-idx').checked).toBe(true);
    expect(text(f)).toContain('Every record must have a value.');
    expect(text(f)).toContain('No two records share a value.');
    expect(text(f)).toContain('Can filter the public address.');
    expect(button(f, 'Save rules').disabled).toBe(true);

    await flip(f, 'cl-fr-uniq');
    expect(button(f, 'Save rules').disabled).toBe(false);
    await flip(f, 'cl-fr-uniq');
    expect(button(f, 'Save rules').disabled).toBe(true);
  });

  it('long text: Unique and Filterable are off, disabled and say why', async () => {
    const f = await draw({ type: 'long_text', is_indexed: 0 });
    expect(input(f, 'cl-fr-uniq').disabled).toBe(true);
    expect(input(f, 'cl-fr-idx').disabled).toBe(true);
    expect(input(f, 'cl-fr-req').disabled).toBe(false);
    expect((q(f, 'label[for=cl-fr-uniq]') as HTMLElement).textContent).toContain('Not available for long text.');
    expect((q(f, 'label[for=cl-fr-idx]') as HTMLElement).textContent).toContain('Not available for long text.');
  });

  it('a relation is always filterable: on, disabled, and its stored flag is what travels', async () => {
    const f = await draw({ type: 'relation', is_indexed: 0, relation_name: 'Crop types', relation_code: 'crop_types' });
    expect(input(f, 'cl-fr-idx').checked).toBe(true);
    expect(input(f, 'cl-fr-idx').disabled).toBe(true);
    expect(text(f)).toContain('A field with an options list can always be used as a filter.');
    expect(text(f)).not.toContain('relation');
    expect(f.componentInstance.changed).toBe(false);
    api.setFieldRules.mockReturnValue(new Subject());
    await flip(f, 'cl-fr-req');
    f.componentInstance.submit();
    expect(api.setFieldRules.mock.calls[0][1]).toMatchObject({ is_required: true, is_unique: false, is_indexed: false });
    expect(text(f)).not.toContain('will get an error');
  });

  it('on a published field it says what turning Required and Unique on asks of the records already there', async () => {
    const f = await draw({ is_indexed: 0 });
    expect(text(f)).not.toContain('Every existing record');
    await flip(f, 'cl-fr-req');
    expect(text(f)).toContain('Every existing record must already have a value in this field.');
    await flip(f, 'cl-fr-uniq');
    expect(text(f)).toContain('No two records may share a value, inactive ones included.');
  });

  it('warns when the field stops being a filter: Filterable off, or Unique off with Filterable off', async () => {
    const f = await draw({ is_indexed: 1 });
    await flip(f, 'cl-fr-idx');
    expect(text(f)).toContain(FILTER_WARNING);
    expect(q(f, '.fr-note--warn .pi-exclamation-triangle')).not.toBeNull();

    const g = await draw({ is_unique: 1, is_indexed: 0 });
    expect(text(g)).not.toContain(FILTER_WARNING);
    await flip(g, 'cl-fr-uniq');
    expect(text(g)).toContain(FILTER_WARNING);
    await flip(g, 'cl-fr-idx');
    expect(text(g)).not.toContain(FILTER_WARNING);
  });

  it('a unique field always filters: Filterable shows on and locked, and its own value is what travels', async () => {
    const f = await draw({ is_unique: 0, is_indexed: 0 });
    expect(input(f, 'cl-fr-idx').checked).toBe(false);
    await flip(f, 'cl-fr-uniq');
    expect(input(f, 'cl-fr-idx').checked).toBe(true);
    expect(input(f, 'cl-fr-idx').disabled).toBe(true);
    expect((q(f, 'label[for=cl-fr-idx]') as HTMLElement).textContent).toContain('A unique field can always be used as a filter.');
    await flip(f, 'cl-fr-idx');
    api.setFieldRules.mockReturnValue(new Subject());
    f.componentInstance.submit();
    expect(api.setFieldRules.mock.calls[0][1]).toMatchObject({ is_unique: true, is_indexed: false });
  });

  it('turning Unique off frees Filterable again and says how to keep the filter', async () => {
    const f = await draw({ is_unique: 1, is_indexed: 0 });
    expect(input(f, 'cl-fr-idx').checked).toBe(true);
    expect(input(f, 'cl-fr-idx').disabled).toBe(true);
    await flip(f, 'cl-fr-uniq');
    expect(input(f, 'cl-fr-idx').disabled).toBe(false);
    expect(input(f, 'cl-fr-idx').checked).toBe(false);
    expect(text(f)).toContain(`${FILTER_WARNING} Turn on Filterable to keep that filter.`);
    await flip(f, 'cl-fr-idx');
    expect(text(f)).not.toContain('will get an error');
    api.setFieldRules.mockReturnValue(new Subject());
    f.componentInstance.submit();
    expect(api.setFieldRules.mock.calls[0][1]).toMatchObject({ is_unique: false, is_indexed: true });
  });

  it('turning Filterable off alone warns without the advice', async () => {
    const f = await draw({ is_indexed: 1 });
    await flip(f, 'cl-fr-idx');
    expect(text(f)).toContain(FILTER_WARNING);
    expect(text(f)).not.toContain('Turn on Filterable');
  });

  it('opens with the keyboard inside: Cancel carries autofocus, the element p-dialog focuses', async () => {
    const f = await draw();
    expect(q(f, '[autofocus]')?.textContent).toContain('Cancel');
  });

  it('keeps the notes in one live region that is always there, and draws them inside it', async () => {
    const f = await draw({ is_indexed: 0 });
    const region = q(f, '.fr-notes');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.children.length).toBe(0);
    await flip(f, 'cl-fr-req');
    expect(q(f, '.fr-notes')).toBe(region);
    expect(region.textContent).toContain('Every existing record must already have a value in this field.');
    expect(f.nativeElement.querySelectorAll('[aria-live]').length).toBe(1);
  });

  it('reads the stored rules of the field the tab passes after a reload, keeping the switches where the person left them', async () => {
    const f = await draw({ is_required: 0 });
    await flip(f, 'cl-fr-req');
    expect(f.componentInstance.changed).toBe(true);
    // The save landed although its answer was lost: the tab reloads and passes the fresh field.
    f.componentInstance.field = field({ is_required: 1 });
    f.componentInstance.ngOnChanges({ field: new SimpleChange(null, f.componentInstance.field, false) });
    await settle(f);
    expect(input(f, 'cl-fr-req').checked).toBe(true);
    expect(f.componentInstance.changed).toBe(false);
    expect(button(f, 'Save rules').disabled).toBe(true);
  });

  it('says nothing about the records on a draft field', async () => {
    const f = await draw({ is_indexed: 1 }, false);
    await flip(f, 'cl-fr-req');
    await flip(f, 'cl-fr-idx');
    expect(text(f)).not.toContain('Every existing record');
    expect(text(f)).not.toContain('will get an error');
  });

  it('sends the three rules and the request_id once for a double click', async () => {
    const f = await draw();
    api.setFieldRules.mockReturnValue(new Subject());
    await flip(f, 'cl-fr-req');
    button(f, 'Save rules').click();
    button(f, 'Save rules').click();
    expect(api.setFieldRules).toHaveBeenCalledTimes(1);
    const [id, body] = api.setFieldRules.mock.calls[0];
    expect(id).toBe(11);
    expect(body).toEqual({ is_required: true, is_unique: false, is_indexed: true, request_id: expect.any(String) });
    await settle(f);
    expect(button(f, 'Saving…').disabled).toBe(true);
  });

  it('while saving, a click on any switch does not change the rules', async () => {
    const f = await draw({ is_indexed: 1 });
    api.setFieldRules.mockReturnValue(new Subject());
    await flip(f, 'cl-fr-req');
    f.componentInstance.submit();
    await settle(f);
    expect(f.componentInstance.saving).toBe(true);
    await flip(f, 'cl-fr-req');
    await flip(f, 'cl-fr-uniq');
    await flip(f, 'cl-fr-idx');
    const c = f.componentInstance;
    expect([c.isRequired, c.isUnique, c.isIndexed]).toEqual([true, false, true]);
    expect(input(f, 'cl-fr-req').disabled).toBe(true);
  });

  it('keeps the dialog open with the message of the back on a 400', async () => {
    const f = await draw();
    const answer = new Subject<FieldRow>();
    api.setFieldRules.mockReturnValue(answer);
    await flip(f, 'cl-fr-req');
    f.componentInstance.submit();
    answer.error({
      status: 400,
      error: { message: '2 records have no value in "Name" (inactive records count too). Fill them in first, then make the field required.' }
    });
    await settle(f);
    expect(f.componentInstance.visible).toBe(true);
    expect(q(f, '.cl-error').textContent).toContain('2 records have no value in "Name"');
  });

  it('asks before dropping a change on Cancel', async () => {
    const f = await draw();
    await flip(f, 'cl-fr-uniq');
    button(f, 'Cancel').click();
    await settle(f);
    expect(q(f, 'app-cl-discard-bar')).not.toBeNull();
    expect(f.componentInstance.visible).toBe(true);
  });

  it('emits done once with «Rules updated»', async () => {
    const f = await draw();
    const answer = new Subject<FieldRow>();
    api.setFieldRules.mockReturnValue(answer);
    const done = jest.fn();
    f.componentInstance.done.subscribe(done);
    await flip(f, 'cl-fr-uniq');
    f.componentInstance.submit();
    answer.next(field({ is_unique: 1 }));
    answer.complete();
    f.componentInstance.submit();
    expect(done).toHaveBeenCalledTimes(1);
    expect(api.setFieldRules).toHaveBeenCalledTimes(1);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Rules updated' }));
    expect(f.componentInstance.visible).toBe(false);
  });
});

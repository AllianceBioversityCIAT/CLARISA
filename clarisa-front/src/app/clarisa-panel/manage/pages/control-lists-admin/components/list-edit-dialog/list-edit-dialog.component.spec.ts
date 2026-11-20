import { Component, Input, NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Subject } from 'rxjs';
import { ListRow } from '../../models/control-lists.models';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { DiscardBarComponent } from '../discard-bar/discard-bar.component';
import { ListEditDialogComponent } from './list-edit-dialog.component';

/** PrimeNG's dialog, reduced to drawing its content while visible. */
@Component({ selector: 'p-dialog', template: '<div class="dlg" *ngIf="visible"><ng-content></ng-content></div>' })
class DialogStub {
  @Input() visible = false;
}

const api = { updateList: jest.fn() };
const toast = { add: jest.fn() };

const list = { id: 7, code: 'crops', name: 'Crops', description: 'Crops grown by the centres.' } as ListRow;

async function draw(over: Partial<ListRow> = {}): Promise<ComponentFixture<ListEditDialogComponent>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    declarations: [ListEditDialogComponent, DialogStub, DiscardBarComponent],
    imports: [FormsModule, ButtonModule, InputTextModule, InputTextareaModule, NoopAnimationsModule],
    providers: [
      { provide: ControlListsApiService, useValue: api },
      { provide: MessageService, useValue: toast }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  }).compileComponents();
  const f = TestBed.createComponent(ListEditDialogComponent);
  f.componentInstance.list = { ...list, ...over };
  f.componentInstance.visible = true;
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
const button = (f: ComponentFixture<unknown>, label: string): HTMLButtonElement =>
  Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b =>
    b.textContent?.includes(label)
  ) as HTMLButtonElement;

async function type(f: ComponentFixture<unknown>, selector: string, value: string): Promise<void> {
  const el = q<HTMLInputElement>(f, selector);
  el.value = value;
  el.dispatchEvent(new Event('input'));
  await settle(f);
}

describe('ListEditDialogComponent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens with the stored name and description, the code shown as fixed, and Save off until something changes', async () => {
    const f = await draw();
    expect(q<HTMLInputElement>(f, '#cl-le-name').value).toBe('Crops');
    expect(q<HTMLTextAreaElement>(f, '#cl-le-desc').value).toBe('Crops grown by the centres.');
    expect(q(f, '#cl-le-name').getAttribute('maxlength')).toBe('150');
    expect(q(f, '#cl-le-desc').getAttribute('maxlength')).toBe('500');
    expect(q(f, '.le-code').textContent).toContain('crops');
    expect(q(f, '.le-code').textContent).toContain('The code is the public address of the list and cannot be changed.');
    expect(button(f, 'Save changes').disabled).toBe(true);

    await type(f, '#cl-le-name', 'Crops ');
    expect(button(f, 'Save changes').disabled).toBe(true);
    await type(f, '#cl-le-name', '');
    expect(button(f, 'Save changes').disabled).toBe(true);
    await type(f, '#cl-le-name', 'Crop species');
    expect(button(f, 'Save changes').disabled).toBe(false);
  });

  it('sends the trimmed name and a null description when it is cleared, once for a double click', async () => {
    const f = await draw();
    const answer = new Subject<ListRow>();
    api.updateList.mockReturnValue(answer);
    await type(f, '#cl-le-name', '  Crop species ');
    await type(f, '#cl-le-desc', '   ');
    button(f, 'Save changes').click();
    button(f, 'Save changes').click();
    expect(api.updateList).toHaveBeenCalledTimes(1);
    expect(api.updateList).toHaveBeenCalledWith(7, { name: 'Crop species', description: null });
    await settle(f);
    expect(button(f, 'Saving…').disabled).toBe(true);
  });

  it('keeps the dialog open with the message of the back on a 400', async () => {
    const f = await draw();
    const answer = new Subject<ListRow>();
    api.updateList.mockReturnValue(answer);
    await type(f, '#cl-le-name', 'Crop species');
    f.componentInstance.submit();
    answer.error({ status: 400, error: { message: 'The code and the owner role of a list cannot be changed.' } });
    await settle(f);
    expect(f.componentInstance.visible).toBe(true);
    expect(q(f, '[role=alert]').textContent).toContain('The code and the owner role of a list cannot be changed.');
    expect(button(f, 'Save changes').disabled).toBe(false);
  });

  it('asks before dropping a change on Cancel, and closes at once when nothing changed', async () => {
    const f = await draw();
    button(f, 'Cancel').click();
    await settle(f);
    expect(f.componentInstance.visible).toBe(false);

    const g = await draw();
    await type(g, '#cl-le-desc', 'Food crops.');
    button(g, 'Cancel').click();
    await settle(g);
    expect(q(g, 'app-cl-discard-bar')).not.toBeNull();
    expect(g.componentInstance.visible).toBe(true);
  });

  it('emits done once and says «List updated» when the back saves it', async () => {
    const f = await draw({ description: null });
    const answer = new Subject<ListRow>();
    api.updateList.mockReturnValue(answer);
    const done = jest.fn();
    f.componentInstance.done.subscribe(done);
    await type(f, '#cl-le-desc', 'Food crops.');
    f.componentInstance.submit();
    expect(api.updateList).toHaveBeenCalledWith(7, { name: 'Crops', description: 'Food crops.' });
    answer.next({ ...list, description: 'Food crops.' });
    answer.complete();
    f.componentInstance.submit();
    expect(done).toHaveBeenCalledTimes(1);
    expect(api.updateList).toHaveBeenCalledTimes(1);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'List updated' }));
    expect(f.componentInstance.visible).toBe(false);
  });
});

import { ElementRef } from '@angular/core';
import { FieldTypePickerComponent } from './field-type-picker.component';

const types = [
  { value: 'text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'integer', label: 'Whole number' },
  { value: 'decimal', label: 'Decimal number' }
];

function create() {
  const buttons = types.map(() => ({ focus: jest.fn() }));
  const host = { nativeElement: { querySelectorAll: () => buttons } } as unknown as ElementRef<HTMLElement>;
  const picker = new FieldTypePickerComponent(host);
  picker.types = types;
  const chosen = jest.fn();
  picker.valueChange.subscribe(chosen);
  return { picker, chosen, buttons };
}
const key = (name: string) => ({ key: name, preventDefault: jest.fn() }) as unknown as KeyboardEvent;

describe('FieldTypePickerComponent', () => {
  it('chooses a type once, and nothing while disabled', () => {
    const { picker, chosen } = create();
    picker.choose(picker.choices[1]);
    picker.choose(picker.choices[1]);
    expect(chosen).toHaveBeenCalledTimes(1);
    expect(chosen).toHaveBeenCalledWith('long_text');
    picker.disabled = true;
    picker.choose(picker.choices[0]);
    expect(chosen).toHaveBeenCalledTimes(1);
  });

  it('is one tab stop: the chosen type, or the first one when none is chosen', () => {
    const { picker } = create();
    expect(picker.choices.map((c, i) => picker.tabIndex(c, i))).toEqual([0, -1, -1, -1]);
    picker.value = 'integer';
    expect(picker.choices.map((c, i) => picker.tabIndex(c, i))).toEqual([-1, -1, 0, -1]);
  });

  it('tells a deliberate pick from a pass with the arrows, and can take the keyboard back', () => {
    const { picker, chosen, buttons } = create();
    const picked = jest.fn();
    picker.picked.subscribe(picked);
    picker.onKey(key('ArrowRight'), 0);
    expect(picked).not.toHaveBeenCalled();
    picker.pick(picker.choices[2]);
    expect(chosen).toHaveBeenLastCalledWith('integer');
    expect(picked).toHaveBeenCalledWith('integer');
    // Picking the type that is already chosen is still a decision: the dialog folds on it.
    picker.pick(picker.choices[2]);
    expect(picked).toHaveBeenCalledTimes(2);
    picker.focusChosen();
    expect(buttons[2].focus).toHaveBeenCalled();
  });

  it('moves with the arrows across its two columns, choosing and focusing, and stops at the edges', () => {
    const { picker, chosen, buttons } = create();
    picker.onKey(key('ArrowRight'), 0);
    expect(chosen).toHaveBeenLastCalledWith('long_text');
    expect(buttons[1].focus).toHaveBeenCalled();
    picker.onKey(key('ArrowDown'), 1);
    expect(chosen).toHaveBeenLastCalledWith('decimal');
    picker.onKey(key('ArrowDown'), 3);
    picker.onKey(key('ArrowLeft'), 0);
    picker.onKey(key('Enter'), 0);
    expect(chosen).toHaveBeenCalledTimes(2);
  });
});

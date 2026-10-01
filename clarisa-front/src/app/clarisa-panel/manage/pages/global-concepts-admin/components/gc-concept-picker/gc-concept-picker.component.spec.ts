import { GcConceptPickerComponent, filterConceptOptions } from './gc-concept-picker.component';

describe('GcConceptPickerComponent', () => {
  it('keeps Enter inside the picker, so it never submits the surrounding form', () => {
    const host = document.createElement('div');
    const form = document.createElement('form');
    const input = document.createElement('input');
    form.appendChild(host);
    host.appendChild(input);
    const picker = new GcConceptPickerComponent();
    // Same wiring Angular does for the @HostListener('keydown.enter').
    host.addEventListener('keydown', event => {
      if ((event as KeyboardEvent).key === 'Enter') picker.keepEnterInside(event);
    });
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

    input.dispatchEvent(enter);

    expect(enter.defaultPrevented).toBe(true);
  });

  it('still filters by label and id', () => {
    expect(filterConceptOptions([{ term_id: 12, preferred_label: 'Outcome' }], '12')).toHaveLength(1);
  });
});

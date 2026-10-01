import { SimpleChange } from '@angular/core';
import { JustificationDialogComponent } from './justification-dialog.component';

describe('JustificationDialogComponent', () => {
  const open = () => {
    const dialog = new JustificationDialogComponent();
    dialog.visible = true;
    dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    return dialog;
  };

  it('will not confirm without a justification of at least 5 characters', () => {
    const dialog = open();
    const emitted = jest.fn();
    dialog.confirmed.subscribe(emitted);

    dialog.text = '   ';
    dialog.submit();
    dialog.text = 'left';
    dialog.submit();

    expect(dialog.valid).toBe(false);
    expect(dialog.disabled).toBe(true);
    expect(emitted).not.toHaveBeenCalled();
  });

  it('confirms once with the trimmed text, even on a double tap', () => {
    const dialog = open();
    const emitted = jest.fn();
    dialog.confirmed.subscribe(emitted);

    dialog.text = '  Left the MELIAF team  ';
    dialog.submit();
    dialog.submit();

    expect(emitted).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveBeenCalledWith('Left the MELIAF team');
  });

  it('opens again after the parent reports an error, and starts empty on the next open', () => {
    const dialog = open();
    const emitted = jest.fn();
    dialog.confirmed.subscribe(emitted);
    dialog.text = 'Left the MELIAF team';
    dialog.submit();

    dialog.error = 'Could not remove the role';
    dialog.ngOnChanges({ error: new SimpleChange(null, dialog.error, false) });
    dialog.submit();
    expect(emitted).toHaveBeenCalledTimes(2);

    dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    expect(dialog.text).toBe('');
  });

  it('does not close while the removal travels', () => {
    const dialog = open();
    const closed = jest.fn();
    dialog.visibleChange.subscribe(closed);

    dialog.busy = true;
    dialog.close();
    expect(closed).not.toHaveBeenCalled();

    dialog.busy = false;
    dialog.close();
    expect(closed).toHaveBeenCalledWith(false);
  });
});

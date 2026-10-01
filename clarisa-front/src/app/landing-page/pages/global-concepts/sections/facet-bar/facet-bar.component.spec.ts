import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FacetBarComponent } from './facet-bar.component';
import { FacetView } from '../../global-concepts.filters';

describe('FacetBarComponent', () => {
  let fixture: ComponentFixture<FacetBarComponent>;
  let component: FacetBarComponent;
  const el = () => fixture.nativeElement as HTMLElement;

  const facets: FacetView[] = [
    {
      code: 'functions',
      label: 'Function',
      selected: 1,
      options: [
        { value: 'mel', label: 'MEL', count: 12, checked: true },
        { value: 'learning', label: 'Learning', count: 0, checked: false }
      ]
    },
    { code: 'term_type', label: 'Term type', selected: 0, options: [{ value: 'core', label: 'Core term', count: 4, checked: false }] }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [FacetBarComponent] }).compileComponents();
    fixture = TestBed.createComponent(FacetBarComponent);
    component = fixture.componentInstance;
    component.facets = facets;
    component.selected = 1;
    component.resultCount = 12;
    component.chips = [{ code: 'functions', value: 'mel', label: 'Function: MEL' }];
    fixture.detectChanges();
  });

  afterEach(() => (document.body.style.overflow = ''));

  it('opens a facet dropdown with a checkbox and a count per value', () => {
    (el().querySelector('.gc-dd__btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    const rows = Array.from(el().querySelectorAll('.gc-dd__panel .gc-check'));
    expect(rows.map(r => r.querySelector('.gc-check__label')?.textContent?.trim())).toEqual(['MEL', 'Learning']);
    expect(rows.map(r => r.querySelector('.gc-check__count')?.textContent?.trim())).toEqual(['12', '0']);
    // A value that would give nothing cannot be ticked.
    expect((rows[1].querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('reports a ticked value', () => {
    const spy = jest.fn();
    component.toggleValue.subscribe(spy);
    component.toggleDropdown('term_type');
    fixture.detectChanges();
    (el().querySelector('.gc-dd__panel input') as HTMLInputElement).dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith({ code: 'term_type', value: 'core' });
  });

  it('shows the active chips with remove buttons and clear all', () => {
    const removed = jest.fn();
    const cleared = jest.fn();
    component.removeChip.subscribe(removed);
    component.clearAll.subscribe(cleared);
    (el().querySelector('.gc-filter-chip__x') as HTMLButtonElement).click();
    expect(removed).toHaveBeenCalledWith(component.chips[0]);
    const clear = Array.from(el().querySelectorAll('.gc-fb__chips button')).find(b => b.textContent?.includes('Clear all')) as HTMLButtonElement;
    clear.click();
    expect(cleared).toHaveBeenCalled();
  });

  it('toggles the phone filter sheet, locks the page scroll and closes on Escape', fakeAsync(() => {
    const btn = el().querySelector('.gc-fb__phone-btn') as HTMLButtonElement;
    expect(btn.textContent).toContain('Filters (1)');
    expect(el().querySelector('.gc-sheet')).toBeNull();

    btn.click();
    fixture.detectChanges();
    tick();
    expect(component.sheetOpen).toBe(true);
    expect(el().querySelector('.gc-sheet [role="dialog"]')).not.toBeNull();
    expect(el().querySelectorAll('.gc-sheet__group').length).toBe(2);
    expect(el().querySelector('.gc-sheet__show')?.textContent).toContain('Show 12 concepts');
    expect(document.body.style.overflow).toBe('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    tick();
    expect(component.sheetOpen).toBe(false);
    expect(el().querySelector('.gc-sheet')).toBeNull();
    expect(document.body.style.overflow).toBe('');

    component.toggleSheet();
    tick();
    component.toggleSheet();
    tick();
    expect(component.sheetOpen).toBe(false);
  }));

  it('switches straight from one dropdown to another', () => {
    const buttons = el().querySelectorAll('.gc-dd__btn');
    (buttons[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.openFacet).toBe('term_type');
    // Ticking inside the open panel keeps it open (multi-select).
    (el().querySelector('.gc-dd__panel input') as HTMLInputElement).click();
    expect(component.openFacet).toBe('term_type');
  });

  it('closes an open dropdown on a click outside', () => {
    component.toggleDropdown('functions');
    fixture.detectChanges();
    document.body.click();
    expect(component.openFacet).toBeNull();
  });

  describe('keyboard', () => {
    const trigger = () => el().querySelector('.gc-dd__btn') as HTMLButtonElement;

    it('Escape closes the dropdown and puts focus back on its button', () => {
      trigger().click();
      fixture.detectChanges();
      (el().querySelector('.gc-dd__panel input') as HTMLInputElement).focus();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(component.openFacet).toBeNull();
      expect(document.activeElement).toBe(trigger());
    });

    it('closes the dropdown when focus tabs out of it, and not while it moves inside', () => {
      trigger().click();
      fixture.detectChanges();
      const box = el().querySelector('.gc-dd') as HTMLElement;
      const inside = el().querySelector('.gc-dd__panel input') as HTMLInputElement;

      box.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: inside }));
      expect(component.openFacet).toBe('functions');

      box.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: el().querySelector('#gc-sort') }));
      expect(component.openFacet).toBeNull();
    });

    it('keeps Tab inside the open phone sheet', fakeAsync(() => {
      component.openSheet();
      fixture.detectChanges();
      tick();
      const panel = el().querySelector('.gc-sheet__panel') as HTMLElement;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      last.focus();
      const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      last.dispatchEvent(forward);
      expect(forward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(first);

      const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      first.dispatchEvent(back);
      expect(document.activeElement).toBe(last);
      component.closeSheet();
      tick();
    }));

    it('leaves the page scroll lock of someone else in place when the sheet closes', fakeAsync(() => {
      document.body.style.overflow = 'hidden';
      component.openSheet();
      tick();
      component.closeSheet();
      tick();
      expect(document.body.style.overflow).toBe('hidden');

      document.body.style.overflow = 'auto';
      component.openSheet();
      tick();
      expect(document.body.style.overflow).toBe('hidden');
      component.closeSheet();
      tick();
      expect(document.body.style.overflow).toBe('auto');
    }));
  });
});

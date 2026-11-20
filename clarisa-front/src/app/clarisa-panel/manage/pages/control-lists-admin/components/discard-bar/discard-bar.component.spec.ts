import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonModule } from 'primeng/button';
import { DiscardBarComponent } from './discard-bar.component';

describe('DiscardBarComponent', () => {
  let fixture: ComponentFixture<DiscardBarComponent>;
  let before: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [DiscardBarComponent], imports: [ButtonModule] }).compileComponents();
    before = document.createElement('button');
    document.body.appendChild(before);
    before.focus();
    fixture = TestBed.createComponent(DiscardBarComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    before.remove();
    fixture.nativeElement.remove();
  });

  const buttons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('button'));

  it('asks the question and offers the two ways out', () => {
    expect(fixture.nativeElement.textContent).toContain('Discard your changes?');
    expect(fixture.nativeElement.textContent).toContain('They will not be saved.');
    expect(buttons().map(b => b.textContent?.trim())).toEqual(['Keep editing', 'Discard']);
    expect(fixture.nativeElement.querySelector('[role="group"]').getAttribute('aria-labelledby')).toBe('cl-discard-title');
  });

  it('puts the keyboard on «Keep editing», not on the destructive button', () => {
    expect(document.activeElement).toBe(buttons()[0]);
    expect(document.activeElement).not.toBe(buttons()[1]);
  });

  it('«Keep editing» gives the keyboard back to what had it and emits keep', () => {
    const keep = jest.fn();
    fixture.componentInstance.keep.subscribe(keep);
    buttons()[0].click();
    expect(keep).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(before);
  });

  it('«Discard» emits discard and nothing else', () => {
    const keep = jest.fn();
    const discard = jest.fn();
    fixture.componentInstance.keep.subscribe(keep);
    fixture.componentInstance.discard.subscribe(discard);
    buttons()[1].click();
    expect(discard).toHaveBeenCalledTimes(1);
    expect(keep).not.toHaveBeenCalled();
  });
});

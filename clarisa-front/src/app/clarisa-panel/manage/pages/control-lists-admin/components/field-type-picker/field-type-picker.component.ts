import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { FieldTypeOption } from '../../models/control-lists.models';
import { TypeChoice, typeChoices } from '../../utils/field-types';

/** The kinds of data a field can hold, all in sight: one is chosen like a radio group. */
@Component({
  selector: 'app-cl-field-type-picker',
  templateUrl: './field-type-picker.component.html',
  styleUrls: ['./field-type-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldTypePickerComponent {
  choices: TypeChoice[] = [];

  @Input() set types(value: FieldTypeOption[]) {
    this.choices = typeChoices(value ?? []);
  }
  @Input() value: string | null = null;
  @Input() disabled = false;
  @Input() labelledBy = '';
  @Output() valueChange = new EventEmitter<string>();
  /** A click, Enter or Space on a type: a decision, unlike passing over it with the arrows. */
  @Output() picked = new EventEmitter<string>();

  constructor(private host: ElementRef<HTMLElement>) {}

  /** One tab stop for the group: the chosen type, or the first one. */
  tabIndex(choice: TypeChoice, index: number): number {
    return (this.value ? choice.value === this.value : index === 0) ? 0 : -1;
  }

  choose(choice: TypeChoice): void {
    if (this.disabled || choice.value === this.value) return;
    this.value = choice.value;
    this.valueChange.emit(choice.value);
  }

  pick(choice: TypeChoice): void {
    if (this.disabled) return;
    this.choose(choice);
    this.picked.emit(choice.value);
  }

  /** Arrows move through the group and choose, as in any radio group. */
  onKey(event: KeyboardEvent, index: number): void {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 2, ArrowLeft: -1, ArrowUp: -2 };
    const move = step[event.key];
    if (!move || this.disabled) return;
    const target = index + move;
    if (target < 0 || target >= this.choices.length) return;
    event.preventDefault();
    this.choose(this.choices[target]);
    this.host.nativeElement.querySelectorAll<HTMLButtonElement>('button')[target]?.focus();
  }

  /** Puts the keyboard on the chosen type (or the first one). */
  focusChosen(): void {
    const buttons = this.host.nativeElement.querySelectorAll<HTMLButtonElement>('button');
    const index = Math.max(
      0,
      this.choices.findIndex(c => c.value === this.value)
    );
    buttons[index]?.focus();
  }

  track(_: number, choice: TypeChoice): string {
    return choice.value;
  }
}

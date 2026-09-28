import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ConceptOption {
  term_id: number;
  preferred_label: string;
  status?: string;
}

/**
 * Concepts matching `query` by TERM ID or label, without the excluded ones.
 * Label prefix matches rank first, then the rest alphabetically.
 */
export function filterConceptOptions(options: ConceptOption[], query: string, exclude: number[] = [], limit = 20): ConceptOption[] {
  const needle = (query ?? '').trim().toLowerCase();
  const skip = new Set(exclude.map(Number));
  return (options ?? [])
    .filter(option => !skip.has(Number(option.term_id)))
    .filter(option => !needle || String(option.term_id).includes(needle) || (option.preferred_label ?? '').toLowerCase().includes(needle))
    .sort((a, b) => {
      const pa = (a.preferred_label ?? '').toLowerCase().startsWith(needle) ? 0 : 1;
      const pb = (b.preferred_label ?? '').toLowerCase().startsWith(needle) ? 0 : 1;
      return pa - pb || (a.preferred_label ?? '').localeCompare(b.preferred_label ?? '');
    })
    .slice(0, limit);
}

/** Autocomplete over the scheme's concepts. Picking one emits it and clears the box for the next. */
@Component({
  selector: 'app-gc-concept-picker',
  template: `
    <p-autoComplete
      styleClass="gc-picker"
      panelStyleClass="admin-dropdown-panel gc-picker__panel"
      appendTo="body"
      field="preferred_label"
      [inputId]="inputId"
      [ariaLabel]="placeholder"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [suggestions]="suggestions"
      [minLength]="0"
      [completeOnFocus]="true"
      [delay]="120"
      [showEmptyMessage]="true"
      emptyMessage="No concept matches"
      [(ngModel)]="query"
      [ngModelOptions]="{ standalone: true }"
      (completeMethod)="complete($event.query)"
      (onSelect)="select($event)">
      <ng-template let-option pTemplate="item">
        <span class="gc-picker__item">
          <span class="gc-picker__id">{{ option.term_id }}</span>
          <span class="gc-picker__label">{{ option.preferred_label }}</span>
          <span class="gc-picker__status" *ngIf="option.status && option.status !== 'approved'">{{ option.status }}</span>
        </span>
      </ng-template>
    </p-autoComplete>
  `,
  styleUrls: ['./gc-concept-picker.component.scss']
})
export class GcConceptPickerComponent {
  @Input() options: ConceptOption[] = [];
  @Input() exclude: number[] = [];
  @Input() placeholder = 'Search a concept by label or TERM ID';
  @Input() inputId = '';
  @Input() disabled = false;
  @Output() picked = new EventEmitter<ConceptOption>();

  query: unknown = '';
  suggestions: ConceptOption[] = [];

  complete(query: string): void {
    this.suggestions = filterConceptOptions(this.options, query, this.exclude);
  }

  select(option: ConceptOption | { value?: ConceptOption }): void {
    const picked = (option as { value?: ConceptOption })?.value ?? (option as ConceptOption);
    if (picked && picked.term_id) this.picked.emit(picked);
    this.query = '';
  }
}

import { Component, Input } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ConceptSuggestion, GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { DEFAULT_SCHEME, GC_BASE, conceptLink, MAX_SUGGEST_TEXT, humanError } from '../../global-concepts.utils';

/**
 * "Check a text": paste a paragraph, get the official concepts it mentions.
 * The text travels in the body of one POST and the back never stores it.
 */
@Component({
  selector: 'app-gc-check-text',
  templateUrl: './check-text.component.html',
  styleUrls: ['./check-text.component.scss'],
  // The shared Global Concepts kit is declared once, globally (src/styles/_global-concepts.scss).
  host: { class: 'gc-kit' }
})
export class CheckTextComponent {
  @Input() scheme = DEFAULT_SCHEME;

  readonly max = MAX_SUGGEST_TEXT;
  readonly base = GC_BASE;

  link(termId: number): (string | number)[] {
    return conceptLink(this.scheme, termId);
  }

  text = '';
  checking = false;
  /** Null until the first check; an empty array is a real "nothing found". */
  suggestions: ConceptSuggestion[] | null = null;
  error: string | null = null;

  constructor(private _api: GlobalConceptsApiService) {}

  get length(): number {
    return this.text.length;
  }

  get canCheck(): boolean {
    return !this.checking && !!this.text.trim() && this.text.length <= this.max;
  }

  check(): void {
    if (!this.canCheck) return;
    this.checking = true;
    this.error = null;
    this._api.suggest(this.scheme, this.text).subscribe({
      next: answer => {
        this.suggestions = answer?.suggestions ?? [];
        this.checking = false;
      },
      error: (error: HttpErrorResponse) => {
        this.suggestions = null;
        this.error = humanError(error, { fallback400: `Paste between 1 and ${this.max.toLocaleString('en')} characters and try again.` });
        this.checking = false;
      }
    });
  }

  reset(): void {
    this.text = '';
    this.suggestions = null;
    this.error = null;
  }

  totalMatches(suggestion: ConceptSuggestion): number {
    return (suggestion.matched ?? []).reduce((sum, match) => sum + (match.count ?? 0), 0);
  }

  trackById(_: number, suggestion: ConceptSuggestion): number {
    return suggestion.term_id;
  }
}

import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { ConceptsAssistStep, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import {
  ASSIST_MESSAGE_MAX,
  ASSIST_SUGGESTIONS,
  assistErrorMessage,
  BLINK_MS,
  coerceValue,
  editTrail,
  historyForTurn,
  TYPE_TICK_MS,
  typingPlan
} from '../../utils/concept-assist';
import { AssistChatEntry, GcAssistSession } from './gc-assist-session.service';

/** Classes the choreography puts on the field wrapper (`.field`); the skin lives in the dialog SCSS. */
export const RING_CLASS = 'gc-assist-ring';
export const BLINK_CLASS = 'gc-assist-blink';

/**
 * The chat beside the full concept editor. One turn: the person writes, the
 * draft (current form values) + the last 20 messages + the hand edits since the
 * last turn go to the back, and every returned step is PLAYED on the form, in
 * order: its tab, a scroll to the field, a brand ring that blinks while the
 * value is typed, then the «AI suggestion» mark. A field the person edited by
 * hand is never typed over: it gets a proposal bubble instead. Nothing is saved
 * here; Save stays the dialog's.
 */
@Component({
  selector: 'app-gc-concept-assistant',
  templateUrl: './gc-concept-assistant.component.html',
  styleUrls: ['./gc-concept-assistant.component.scss'],
  // Also skins the dialog side (layout, sheet, field ring): see the SCSS header.
  encapsulation: ViewEncapsulation.None
})
export class GcConceptAssistantComponent {
  @Input() scheme = 'meliaf';
  @Input() remainingUsd: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('list') private list?: ElementRef<HTMLElement>;
  @ViewChild('box') private box?: ElementRef<HTMLTextAreaElement>;

  readonly suggestions = ASSIST_SUGGESTIONS;
  readonly maxLength = ASSIST_MESSAGE_MAX;
  input = '';
  /** A request is in flight. */
  sending = false;
  /** The returned steps are being played on the form. */
  playing = false;
  private failure: { token: number; text: string } | null = null;
  /** Session the running turn belongs to; a turn of an earlier concept never locks this one. */
  private turnToken = -1;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    readonly session: GcAssistSession
  ) {}

  /** The last failure, only while the dialog is on the concept it happened on. */
  get error(): string | null {
    return this.failure && this.failure.token === this.session.token ? this.failure.text : null;
  }

  get messages(): AssistChatEntry[] {
    return this.session.messages;
  }

  /** One turn at a time: while it is asked or played, Send is locked (double-submit rule). */
  get busy(): boolean {
    return (this.sending || this.playing) && this.turnToken === this.session.token;
  }

  get canSend(): boolean {
    return !this.busy && !!this.input.trim();
  }

  get editTrail(): string {
    return editTrail(this.session.log.fields(), field => this.session.label(field));
  }

  get liveLabel(): string | null {
    return this.session.live ? this.session.label(this.session.live) : null;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    this.send();
  }

  send(text: string = this.input): void {
    const content = (text ?? '').trim().slice(0, ASSIST_MESSAGE_MAX);
    const host = this.session.host;
    if (!content || this.busy || !host) return;

    const token = this.session.token;
    this.turnToken = token;
    const userEntry: AssistChatEntry = { role: 'user', content };
    this.session.messages = [...this.session.messages, userEntry];
    this.input = '';
    this.failure = null;
    this.sending = true;
    this.scrollChat();

    const edits = this.session.log.pending();
    const lastSeq = edits.length ? edits[edits.length - 1].seq : 0;
    const termId = host.termId();
    const body = { draft: host.draft(), messages: historyForTurn(this.session.messages), edits, ...(termId ? { termId } : {}) };

    this._api.conceptsAssistChat(this.scheme, body).subscribe({
      next: answer => {
        if (this.turnToken === token) this.sending = false;
        // The dialog opened another concept meanwhile: this answer is about the old one.
        if (token !== this.session.token) return;
        // The agent now knows these edits; the ones made while it thought stay pending.
        this.session.log.clearUpTo(lastSeq);
        const entry: AssistChatEntry = { role: 'assistant', content: (answer?.reply ?? '').trim() || 'Done.', filled: [], proposed: [], skipped: [] };
        this.session.messages = [...this.session.messages, entry];
        this.scrollChat();
        const steps = Array.isArray(answer?.steps) ? answer.steps.slice(0, 12) : [];
        if (steps.length) void this.play(steps, entry, token);
      },
      error: error => {
        if (this.turnToken === token) this.sending = false;
        if (token !== this.session.token) return;
        // The turn did not happen: the message leaves the history and goes back into the box.
        this.session.messages = this.session.messages.filter(message => message !== userEntry);
        this.input = content;
        this.failure = { token, text: assistErrorMessage(error) };
      }
    });
  }

  useSuggestion(text: string): void {
    this.send(text);
  }

  close(): void {
    this.closed.emit();
  }

  // --------------------------------------------------------- choreography

  async play(steps: ConceptsAssistStep[], entry: AssistChatEntry, token: number): Promise<void> {
    this.playing = true;
    this.turnToken = token;
    try {
      for (const step of steps) {
        if (token !== this.session.token) return;
        await this.playStep(step, entry, token);
      }
    } finally {
      if (token === this.session.token) this.session.live = null;
      if (this.turnToken === token) this.playing = false;
    }
  }

  private async playStep(step: ConceptsAssistStep, entry: AssistChatEntry, token: number): Promise<void> {
    const host = this.session.host;
    const meta = host?.meta(step?.field);
    if (!host || !meta) {
      entry.skipped = [...(entry.skipped ?? []), String(step?.field ?? '')];
      return;
    }
    const field = meta.field;
    const reduced = this.reducedMotion();
    const value = coerceValue(meta, step.value);
    const reason = (step.reason ?? '').trim();

    // 1. Its tab first, so the field exists before it is looked for.
    if (host.currentTab() !== meta.tab) {
      host.setTab(meta.tab);
      await this.wait(reduced ? 0 : 280);
      if (token !== this.session.token) return;
    }

    // 2. Into view, 3. ringed (and blinking unless the person asked for less motion).
    const wrapper = this.fieldElement(meta.elementId);
    wrapper?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: this.narrow() ? 'start' : 'center' });
    if (!reduced) await this.wait(320);
    wrapper?.classList.add(RING_CLASS);
    if (!reduced) wrapper?.classList.add(BLINK_CLASS);
    this.session.live = field;
    const started = Date.now();

    try {
      // Edited by hand: the agent proposes, it never types over the person.
      if (this.session.isHandEdited(field)) {
        this.session.propose(field, value, reason);
        entry.proposed = [...(entry.proposed ?? []), field];
        if (!reduced) await this.wait(700);
        return;
      }

      const previous = host.read(field);
      if (meta.kind === 'text' && !reduced) {
        const typed = await this.type(field, String(value ?? ''), token);
        if (!typed) return;
      } else {
        this.session.writeAi(field, value);
      }

      const rest = BLINK_MS - (Date.now() - started);
      if (!reduced && rest > 0) await this.wait(rest);
      if (token !== this.session.token) return;
      this.session.markSuggested(field, previous, value, reason);
      entry.filled = [...(entry.filled ?? []), field];
    } finally {
      wrapper?.classList.remove(RING_CLASS, BLINK_CLASS);
    }
  }

  /** Progressive fill, ~30 ms a letter, never longer than 1.2 s. Stops if the person takes the field. */
  private async type(field: string, text: string, token: number): Promise<boolean> {
    for (const length of typingPlan(text.length)) {
      if (token !== this.session.token || this.session.isHandEdited(field)) return false;
      this.session.writeAi(field, text.slice(0, length));
      await this.wait(TYPE_TICK_MS);
    }
    return token === this.session.token && !this.session.isHandEdited(field);
  }

  /** Jump back to a field named in a reply (the chips under an answer). */
  async focusField(field: string): Promise<void> {
    const host = this.session.host;
    const meta = host?.meta(field);
    if (!host || !meta) return;
    if (host.currentTab() !== meta.tab) {
      host.setTab(meta.tab);
      await this.wait(this.reducedMotion() ? 0 : 280);
    }
    const wrapper = this.fieldElement(meta.elementId);
    wrapper?.scrollIntoView?.({ behavior: this.reducedMotion() ? 'auto' : 'smooth', block: this.narrow() ? 'start' : 'center' });
    wrapper?.classList.add(RING_CLASS);
    await this.wait(BLINK_MS);
    wrapper?.classList.remove(RING_CLASS);
  }

  // ---------------------------------------------------------------- seams

  /** Overridden in tests; a real timer in the app (inside the zone, so the view repaints). */
  wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  }

  private narrow(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 900px)')?.matches;
  }

  fieldElement(id: string): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const control = document.getElementById(id);
    return (control?.closest('.field') as HTMLElement | null) ?? control;
  }

  private scrollChat(): void {
    setTimeout(() => {
      const el = this.list?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  focusInput(): void {
    setTimeout(() => this.box?.nativeElement.focus());
  }
}

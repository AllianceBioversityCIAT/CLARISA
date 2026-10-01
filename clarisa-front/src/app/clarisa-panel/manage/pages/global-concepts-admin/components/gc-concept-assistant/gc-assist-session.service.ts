import { Injectable } from '@angular/core';
import { ConceptsAssistMessage } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { AssistEditLog, AssistFieldMeta, AssistTab, cloneValue, sameValue } from '../../utils/concept-assist';

/** What the dialog lends the assistant: its form, its tabs and the saved baseline. */
export interface AssistHost {
  currentTab(): string;
  setTab(tab: AssistTab): void;
  meta(field: string): AssistFieldMeta | null;
  read(field: string): unknown;
  /** Programmatic write: never logged as a hand edit. */
  write(field: string, value: unknown): void;
  /** The value the concept had when the dialog opened. */
  baseline(field: string): unknown;
  /** Human text of a value (list codes → labels), for the proposal bubble. */
  display(field: string, value: unknown): string;
  draft(): Record<string, unknown>;
  termId(): number | null;
}

/**
 * `suggested`: the AI typed it; Accept keeps it, Undo puts the previous value back.
 * `proposal`: the person had edited the field by hand, so the AI did NOT type it;
 * the value waits in a bubble with "Use this".
 */
export interface AssistMark {
  field: string;
  state: 'suggested' | 'proposal';
  value: unknown;
  previous: unknown;
  reason: string;
}

export interface AssistChatEntry extends ConceptsAssistMessage {
  filled?: string[];
  proposed?: string[];
  skipped?: string[];
}

/** localStorage key of a concept's chat; `null` term = the concept being created. */
export function assistChatKey(scheme: string, termId: number | null): string {
  return `gc-assist-chat:${(scheme ?? '').toLowerCase()}:${termId ?? 'new'}`;
}

/** Most messages kept per chat: the back reads only the last 20 anyway. */
const STORED_MAX = 60;

function readChat(key: string): AssistChatEntry[] {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeChat(key: string, messages: AssistChatEntry[]): void {
  try {
    if (messages.length) localStorage.setItem(key, JSON.stringify(messages.slice(-STORED_MAX)));
    else localStorage.removeItem(key);
  } catch {
    // Private window or full storage: the chat still works, it just is not kept.
  }
}

/**
 * Moves the chat of the concept being created to the concept it became, so
 * the full editor opens on the same conversation.
 */
export function handOverChat(scheme: string, termId: number): void {
  const from = assistChatKey(scheme, null);
  const messages = readChat(from);
  if (messages.length) writeChat(assistChatKey(scheme, termId), messages);
  writeChat(from, []);
}

/**
 * State of one assistant session, provided by the concept dialog (one per
 * dialog, reset each time a concept opens) and read by the chat panel and by
 * every field mark. The marks and the edit log end with the dialog session;
 * the chat itself is kept in localStorage per concept (`attach`), so it
 * survives the step from «New concept» to the full editor and a reload.
 */
@Injectable()
export class GcAssistSession {
  /** Bumped by `reset`: an answer or a playback of an earlier session stops. */
  token = 0;
  host: AssistHost | null = null;
  private _messages: AssistChatEntry[] = [];
  /** Where this session's chat is kept; `null` = not kept. */
  private storageKey: string | null = null;

  get messages(): AssistChatEntry[] {
    return this._messages;
  }
  set messages(value: AssistChatEntry[]) {
    this._messages = value;
    if (this.storageKey) writeChat(this.storageKey, value);
  }
  marks: Record<string, AssistMark> = {};
  /** Field being navigated / typed right now. */
  live: string | null = null;
  readonly log = new AssistEditLog();
  private handEdited = new Set<string>();
  /** Fields whose current value came from the AI and was kept (accepted or still suggested). */
  private aiOwned = new Set<string>();
  /** Last value of each field as the session knows it: the `before` of the next hand edit. */
  private known: Record<string, unknown> = {};
  /** Called when a field's AI value is kept, so the dialog can record the provenance. */
  onAccepted: ((field: string) => void) | null = null;

  /**
   * The assistant turn, written by the chat panel and read by the dialog: a
   * request in flight (`sending`), its steps being typed on the form
   * (`playing`), and the session token that turn belongs to.
   */
  sending = false;
  playing = false;
  turnToken = -1;

  /**
   * A turn of THIS session is asked or being typed. The dialog's Save waits for
   * it: saving mid-typing would write a half-typed text, and an answer landing
   * after the save would leave the form dirty with values nobody saved.
   */
  get busy(): boolean {
    return (this.sending || this.playing) && this.turnToken === this.token;
  }

  reset(): void {
    this.token++;
    // Detach first: emptying the session never erases a stored chat.
    this.storageKey = null;
    this._messages = [];
    this.marks = {};
    this.live = null;
    this.log.clear();
    this.handEdited = new Set();
    this.aiOwned = new Set();
    this.known = {};
  }

  /** Binds the session to a concept's stored chat and loads it (after `reset`). */
  attach(key: string): void {
    this.storageKey = key;
    this._messages = readChat(key);
  }

  /** «Clear»: forgets this concept's chat, here and in storage. */
  clearChat(): void {
    if (this.busy) return;
    this.token++;
    this.messages = [];
    this.marks = {};
    this.live = null;
  }

  isHandEdited(field: string): boolean {
    return this.handEdited.has(field);
  }

  isAiOwned(field: string): boolean {
    return this.aiOwned.has(field);
  }

  markOf(field: string): AssistMark | null {
    return this.marks[field] ?? null;
  }

  label(field: string): string {
    return this.host?.meta(field)?.label ?? field;
  }

  display(field: string, value: unknown): string {
    return this.host ? this.host.display(field, value) : String(value ?? '');
  }

  /** The person changed a field (the control's ngModelChange; programmatic writes never get here). */
  recordHandEdit(field: string, after: unknown): void {
    const meta = this.host?.meta(field);
    if (!meta) return;
    const before = field in this.known ? this.known[field] : this.host!.baseline(field);
    this.known[field] = cloneValue(after);
    this.handEdited.add(field);
    this.aiOwned.delete(field);
    // Their hand now owns the value: the AI pill has nothing left to accept or undo.
    if (this.marks[field]?.state === 'suggested') this.dropMark(field);
    this.log.record(field, meta.tab, before, after);
  }

  /** AI write (a typing tick or a set). */
  writeAi(field: string, value: unknown): void {
    if (!this.host) return;
    this.known[field] = cloneValue(value);
    this.host.write(field, cloneValue(value));
  }

  markSuggested(field: string, previous: unknown, value: unknown, reason: string): void {
    const earlier = this.marks[field];
    // A second pass over a field still pending keeps the value from before the FIRST one, so Undo goes all the way back.
    const before = earlier?.state === 'suggested' ? earlier.previous : previous;
    if (sameValue(before, value)) {
      this.dropMark(field);
      return;
    }
    this.aiOwned.add(field);
    this.marks = { ...this.marks, [field]: { field, state: 'suggested', value: cloneValue(value), previous: cloneValue(before), reason } };
  }

  propose(field: string, value: unknown, reason: string): void {
    this.marks = { ...this.marks, [field]: { field, state: 'proposal', value: cloneValue(value), previous: null, reason } };
  }

  accept(field: string): void {
    const mark = this.marks[field];
    if (!mark || mark.state !== 'suggested') return;
    this.dropMark(field);
    // Kept by the person: from now on the agent proposes instead of typing over it.
    this.handEdited.add(field);
    this.onAccepted?.(field);
  }

  undo(field: string): void {
    const mark = this.marks[field];
    if (!mark || mark.state !== 'suggested') return;
    this.writeAi(field, mark.previous);
    this.aiOwned.delete(field);
    this.dropMark(field);
  }

  /** "Use this" on a proposal: the person chose it, so it is their edit and goes in the log. */
  useProposal(field: string): void {
    const mark = this.marks[field];
    if (!mark || mark.state !== 'proposal' || !this.host) return;
    this.host.write(field, cloneValue(mark.value));
    this.recordHandEdit(field, mark.value);
    this.dropMark(field);
  }

  dismiss(field: string): void {
    if (this.marks[field]?.state === 'proposal') this.dropMark(field);
  }

  get pendingCount(): number {
    return Object.values(this.marks).filter(mark => mark.state === 'suggested').length;
  }

  private dropMark(field: string): void {
    const marks = { ...this.marks };
    delete marks[field];
    this.marks = marks;
  }
}

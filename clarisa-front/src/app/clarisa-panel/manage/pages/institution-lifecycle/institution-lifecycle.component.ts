import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  InstitutionApiResponse,
  InstitutionLifecyclePayload,
  InstitutionLifecycleService,
  InstitutionLineageLink,
  InstitutionLineageChangeType,
  InstitutionLineageRole,
  InstitutionRelationType,
  CHANGE_TYPE_TO_RELATION_TYPE,
  InstitutionStatusFilter,
  InstitutionValidityStatus,
} from '../../services/institution-lifecycle.service';
import { matchDropdownPanelToTrigger } from '../../utils/dropdown-panel-width';

/** Flattened institution used by the table. */
interface InstitutionRow {
  id: number;
  code: number;
  name: string;
  acronym: string;
  typeName: string;
  /** Day the row was created in CLARISA, shown as a reference only. */
  added: string | null;
  startDate: string | null;
  endDate: string | null;
  validityStatus: InstitutionValidityStatus;
  replacedBy: InstitutionLineageLink[];
  replaces: InstitutionLineageLink[];
  previousAcronyms: string[];
  previousNames: string[];
  /** Pre-computed haystack so the global filter also matches lineage text. */
  searchText: string;
}

/** Option shown in the successor dropdown. */
interface InstitutionOption {
  id: number;
  label: string;
  name: string;
  acronym: string;
  code: number;
  /** false once the institution has an end date of its own. */
  selectable: boolean;
}

@Component({
  selector: 'app-institution-lifecycle',
  templateUrl: './institution-lifecycle.component.html',
  styleUrls: ['./institution-lifecycle.component.scss'],
})
export class InstitutionLifecycleComponent implements OnInit {
  institutions: InstitutionRow[] = [];
  successorOptions: InstitutionOption[] = [];
  loading = false;
  submitting = false;
  editVisible = false;
  selected: InstitutionRow | null = null;
  statusFilter: InstitutionStatusFilter = 'all';
  /** Successor already recorded for the row being edited, if any. */
  private recordedSuccessorId: number | null = null;

  readonly statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Ended', value: 'ended' }
  ];

  readonly relationTypes: { label: string; value: InstitutionRelationType; hint: string }[] = [
    { label: 'NEW', value: 'NEW', hint: 'Rename / rebranding of the same entity' },
    { label: 'SUCCESSOR', value: 'SUCCESSOR', hint: 'A different entity takes over' },
    { label: 'MERGE', value: 'MERGE', hint: 'Merged into another institution' },
    { label: 'SPLIT', value: 'SPLIT', hint: 'Split into other institutions' }
  ];

  /**
   * Wording of each change type. Keyed by what the API publishes, which is the
   * event (`SUCCESSION`) and not the party to it (`SUCCESSOR`) — printed raw,
   * the latter looked like the role of whichever institution it sat next to,
   * which is exactly what it is not.
   */
  private static readonly CHANGE_TEXT: Record<InstitutionLineageChangeType, string> = {
    RENAME: 'renamed',
    SUCCESSION: 'taken over',
    MERGE: 'merged',
    SPLIT: 'split'
  };

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private _institutionLifecycleService: InstitutionLifecycleService,
    private messages: MessageService,
  ) {
    // `startDate` is deliberately absent. Nobody asked for it — the request
    // that started this work asks for the end date only — and sending it on
    // every save is what made an untouched field able to erase a stored value.
    // The column, the DTO and the PATCH all keep supporting it.
    this.form = this.fb.group({
      endDate: [null],
      replacedByInstitutionId: [null],
      // Not required: it describes the succession edge, so it only travels
      // when a successor was picked, and its dropdown can never be emptied.
      relationType: ['NEW'],
      changeDate: [null],
      note: ['', Validators.maxLength(5000)]
    });
  }

  /** True once a successor is picked: the lineage fields only exist then. */
  get hasSuccessor(): boolean {
    return !!this.form.get('replacedByInstitutionId')?.value;
  }

  /** The API refuses a successor on an institution that is still valid. */
  get endDateRequired(): boolean {
    return this.hasSuccessor;
  }

  ngOnInit(): void {
    this.loadInstitutions(true);
  }

  /**
   * Loads the table rows for the current status filter.
   * The first (unfiltered) load also feeds the successor dropdown, so narrowing
   * the table never shrinks the list of institutions that can be picked.
   */
  loadInstitutions(seedOptions = false): void {
    this.loading = true;
    this._institutionLifecycleService.getInstitutions(this.statusFilter).subscribe({
      next: (resp: InstitutionApiResponse[]) => {
        const list = Array.isArray(resp) ? resp : [];
        this.institutions = list.map((inst) => this.normalizeInstitution(inst));
        if (seedOptions) {
          this.successorOptions = this.institutions.map((row) => this.toOption(row));
          this.refreshSuccessorCandidates();
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      }
    });
  }

  onStatusFilterChange(): void {
    this.loadInstitutions(this.statusFilter === 'all' && !this.successorOptions.length);
  }

  onDropdownShow(event: { originalEvent?: Event }): void {
    matchDropdownPanelToTrigger(event);
  }

  /** Opens the lifecycle dialog pre-filled with the current values of the row. */
  openEdit(row: InstitutionRow): void {
    this.selected = row;
    const currentLink = row.replacedBy.length ? row.replacedBy[0] : null;
    this.form.reset({
      endDate: this.toDate(row.endDate),
      replacedByInstitutionId: this.toSuccessorOptionId(currentLink?.code),
      // The edge publishes the event (`SUCCESSION`); the dropdown and the write
      // payload speak the stored vocabulary (`SUCCESSOR`), so it is translated
      // back here instead of leaving the form on its default and overwriting a
      // recorded relation with 'NEW' on the next save.
      relationType: currentLink?.changeType
        ? CHANGE_TYPE_TO_RELATION_TYPE[currentLink.changeType]
        : 'NEW',
      // An edge that is already recorded keeps its date; a new one is offered
      // today, which is when the person filling the form is doing the change.
      changeDate: this.toDate(currentLink?.changeDate ?? null) ?? (currentLink ? null : new Date()),
      note: ''
    });
    // Remembered so `submit` can tell a row that never had a successor (nothing
    // to send) from one whose recorded successor was just cleared, which the
    // API only removes when the key travels as an explicit null.
    this.recordedSuccessorId = this.toSuccessorOptionId(currentLink?.code);
    this.refreshSuccessorCandidates();
    this.editVisible = true;
  }

  closeEdit(): void {
    this.editVisible = false;
    this.selected = null;
  }

  /**
   * Successor candidates: neither the institution being edited nor one that is
   * itself retired. The API rejects the latter ("is itself retired. Point at
   * the institution that is currently valid"), so offering it can only end in a
   * failed save. The one already recorded stays listed even if it was retired
   * afterwards, so reopening the dialog does not blank the field.
   *
   * A plain field and not a getter. The catalogue holds close to ten thousand
   * institutions, and Angular evaluates a getter bound to `[options]` on every
   * change detection cycle: it would filter the whole list again and hand
   * PrimeNG a brand new array each time, whose changed reference makes the
   * dropdown re-render, which schedules another cycle. The dropdown never
   * painted its options and the tab froze. It is recomputed only when its two
   * inputs actually change: the row being edited and the loaded catalogue.
   */
  availableSuccessors: InstitutionOption[] = [];

  private refreshSuccessorCandidates(): void {
    const currentId = this.selected?.id;
    const recorded = this.recordedSuccessorId;
    this.availableSuccessors = this.successorOptions.filter(
      (option) =>
        option.id !== currentId && (option.selectable || option.id === recorded)
    );
  }

  clearEndDate(): void {
    this.form.get('endDate')?.setValue(null);
  }

  submit(): void {
    if (!this.selected) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const endDate = this.toIsoDate(raw.endDate);
    // `startDate` is not sent. The API only writes the keys it receives, so
    // omitting it leaves whatever the institution already had; sending the
    // null of a field the form no longer shows would wipe it on every save.
    const payload: InstitutionLifecyclePayload = { endDate };

    const chosenSuccessorId = raw.replacedByInstitutionId
      ? Number(raw.replacedByInstitutionId)
      : null;

    if (chosenSuccessorId) {
      // Mirrors the API invariant: a successor only means something once the
      // institution stops being consumable. An empty end date here is a revive,
      // which drops the succession instead of recording one.
      if (!endDate) {
        this.messages.add({
          severity: 'warn',
          summary: 'End of validity required',
          detail: 'An institution can only be replaced once it has an end date. Set one, or clear the successor to bring it back into service.'
        });
        return;
      }

      // The API only rewrites the succession it already has; a different one is
      // rejected. Saying so here avoids sending a request that can only come
      // back as a 400.
      if (this.recordedSuccessorId && chosenSuccessorId !== this.recordedSuccessorId) {
        this.messages.add({
          severity: 'warn',
          summary: 'A successor is already recorded',
          detail: 'Clear the successor and save to remove the one recorded, then pick the new one. Replacing it in a single step is not allowed.'
        });
        return;
      }

      payload.replacedByInstitutionId = chosenSuccessorId;
      payload.relationType = (raw.relationType || 'NEW') as InstitutionRelationType;
      const changeDate = this.toIsoDate(raw.changeDate) ?? endDate;
      if (changeDate) {
        payload.changeDate = changeDate;
      }
    } else if (this.recordedSuccessorId) {
      // Clearing the dropdown has to travel as an explicit null: omitting the
      // key leaves the recorded succession in place, so the panel would answer
      // with a success toast and re-render the successor it was just asked to
      // remove. Sending null removes it without reviving the institution, which
      // would otherwise republish it as valid to PRMS, MEL, MARLO and STAR in
      // between.
      payload.replacedByInstitutionId = null;
    }

    const note = (raw.note || '').trim();
    if (note) {
      payload.note = note;
    }

    const target = this.selected;
    this.submitting = true;
    this._institutionLifecycleService.updateLifecycle(target.id, payload).subscribe({
      next: (resp: any) => {
        this.submitting = false;
        this.editVisible = false;
        this.selected = null;
        const updated = resp?.response ?? resp;
        if (updated?.code) {
          this.mergeUpdatedRow(updated as InstitutionApiResponse);
        } else {
          this.loadInstitutions();
        }
        this.messages.add({
          severity: 'success',
          summary: 'Lifecycle updated',
          detail: resp?.message ?? `Validity of "${target.name}" saved successfully.`
        });
      },
      error: (err) => {
        this.submitting = false;
        this.toastError(err);
      }
    });
  }

  /**
   * Human readable lineage cell.
   *
   * Two facts used to be printed as one: the cell showed the relation type in
   * parentheses, and `SUCCESSOR` there reads as a role. The same
   * `SMO (SUCCESSOR)` then appeared on both ends of the relation, so the table
   * never said which institution came first. The role of the counterpart now
   * comes out in the verb, and the relation type is spelled as what happened.
   *
   * `arrayRole` is the role the entries of this array have by construction —
   * `replacedBy` names successors, `replaces` names predecessors — and it is
   * only a fallback: whenever the edge itself carries its direction that is
   * what wins, so a column bound to the wrong array cannot flip the lineage.
   *
   * It has no default on purpose. A default is only ever reached by an API that
   * publishes neither the codes nor the direction, which is exactly what
   * production answers today — the deploy window this panel has to survive. A
   * `replaces` column written without the argument would then print
   * "Succeeded by SMO" on the successor row: the reported bug, back in silence.
   * Making it required moves that mistake to compile time.
   */
  lineageLabel(links: InstitutionLineageLink[], arrayRole: InstitutionLineageRole): string {
    if (!links?.length) {
      return '';
    }
    return links
      .map((link) => {
        const name = link.acronym || link.name || `#${link.code}`;
        const verb = this.counterpartRole(link, arrayRole) === 'predecessor' ? 'Succeeds' : 'Succeeded by';
        const change = this.changeText(link.changeType);
        return change ? `${verb} ${name} — ${change}` : `${verb} ${name}`;
      })
      .join(', ');
  }

  /**
   * The relations behind the cell, as the API states them.
   *
   * It takes the whole array, the same one `lineageLabel` prints. The tooltip
   * used to be built from `links[0]` while the cell listed every edge, so a
   * MERGE or a SPLIT — the two shapes the dialog itself offers — got a tooltip
   * asserting one relation next to a cell naming several. Today's lineage is
   * 1:1, so this is the cell and the tooltip agreeing by construction rather
   * than by luck.
   */
  lineageTooltip(links: InstitutionLineageLink[]): string {
    if (!links?.length) {
      return '';
    }
    // `; ` separates edges because ` · ` is already the separator inside one.
    // Edges the API cannot be quoted on contribute nothing instead of a blank.
    return links
      .map((link) => this.edgeTooltip(link))
      .filter(Boolean)
      .join('; ');
  }

  /**
   * A single edge, with no room for a reader to invert it: it is built from the
   * absolute ids only, so it comes out identical on the predecessor row and on
   * the successor one. Two rows whose tooltips disagree are two rows describing
   * different relations.
   */
  private edgeTooltip(link: InstitutionLineageLink): string {
    const change = this.changeText(link.changeType);
    const when = change && link.changeDate ? `${change} on ${link.changeDate}` : change || (link.changeDate ? `changed on ${link.changeDate}` : '');
    if (!link.predecessorCode || !link.successorCode) {
      // An API that does not publish the absolute ids yet cannot be quoted on
      // the direction, so the tooltip states the change and nothing else.
      return when;
    }
    const relation = `${link.predecessorCode} → ${link.successorCode}`;
    return when ? `${relation} · ${when}` : relation;
  }

  /**
   * Role of the institution named in the entry, relative to the row being read.
   *
   * The absolute ids are asked first because they are the only reading that
   * survives being passed the wrong array: they name both ends of the relation
   * with the same values in either record. `direction` is the API saying the
   * same thing in one word, and the array the entry came from is the last
   * resort, for a back end that publishes neither.
   */
  private counterpartRole(link: InstitutionLineageLink, arrayRole: InstitutionLineageRole): InstitutionLineageRole {
    const { predecessorCode, successorCode } = link;
    if (predecessorCode && successorCode && predecessorCode !== successorCode) {
      if (link.code === successorCode) {
        return 'successor';
      }
      if (link.code === predecessorCode) {
        return 'predecessor';
      }
    }
    if (link.direction === 'predecessor' || link.direction === 'successor') {
      return link.direction;
    }
    return arrayRole;
  }

  /** The change type as what happened, so no word in the cell reads as a role. */
  private changeText(changeType: InstitutionLineageChangeType | undefined): string {
    return changeType ? InstitutionLifecycleComponent.CHANGE_TEXT[changeType] ?? '' : '';
  }

  private mergeUpdatedRow(updated: InstitutionApiResponse): void {
    const row = this.normalizeInstitution(updated);

    // The dropdown is seeded once, so without this an institution retired in
    // this session would stay on offer as a successor until the page is
    // reloaded — and the API would reject it on save.
    this.successorOptions = this.successorOptions.map((option) =>
      option.id === row.id ? this.toOption(row) : option
    );
    this.refreshSuccessorCandidates();

    // Retiring an institution while the table is narrowed to "Active" (or
    // reviving one while it shows "Ended") leaves a row on screen that the
    // filter no longer matches. Reloading keeps the list honest about what it
    // claims to be showing, and refreshes the successor lineage of the other
    // institutions the same write touched.
    if (this.statusFilter !== 'all' && row.validityStatus !== this.statusFilter) {
      this.loadInstitutions();
      return;
    }

    const index = this.institutions.findIndex((item) => item.id === row.id);
    if (index >= 0) {
      // Replace the array so the PrimeNG table picks the change up.
      const next = [...this.institutions];
      next[index] = row;
      this.institutions = next;
    } else {
      this.loadInstitutions();
    }
  }

  private normalizeInstitution(raw: InstitutionApiResponse): InstitutionRow {
    const id = Number(raw.id ?? raw.code ?? 0);
    const acronym = raw.acronym ?? '';
    const replacedBy = Array.isArray(raw.replacedBy) ? raw.replacedBy : [];
    const replaces = Array.isArray(raw.replaces) ? raw.replaces : [];
    const previousAcronyms = Array.isArray(raw.previousAcronyms) ? raw.previousAcronyms : [];
    const previousNames = Array.isArray(raw.previousNames) ? raw.previousNames : [];
    const endDate = raw.endDate ?? null;

    return {
      id,
      code: Number(raw.code ?? id),
      name: raw.name ?? '',
      acronym,
      typeName: raw.institutionType?.name ?? '',
      added: this.toDayOnly(raw.added),
      startDate: raw.startDate ?? null,
      endDate,
      validityStatus: raw.validityStatus ?? this.deriveValidityStatus(endDate),
      replacedBy,
      replaces,
      previousAcronyms,
      previousNames,
      searchText: [
        raw.name,
        acronym,
        raw.institutionType?.name,
        ...previousNames,
        ...previousAcronyms,
        // Both ends, so a successor can be found by the name of what it
        // replaced and not only through the previous names of a rename.
        ...[...replacedBy, ...replaces].map((link) => `${link.acronym ?? ''} ${link.name ?? ''}`)
      ]
        .filter(Boolean)
        .join(' ')
    };
  }

  /**
   * Fallback for the rare case the API omits the status. An end date still in
   * the future does not retire the institution: it announces when it will be
   * retired, and it stays usable until that day.
   */
  private deriveValidityStatus(endDate: string | null): InstitutionValidityStatus {
    if (!endDate) {
      return 'active';
    }

    const end = this.toDate(endDate);
    if (!end) {
      return 'ended';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return end > today ? 'ending' : 'ended';
  }

  /**
   * Translates the `code` a lineage entry publishes into the `id` the dropdown
   * and the API speak (`where: { id: dto.replacedByInstitutionId }`).
   *
   * They hold the same value on every row today, which is why prefilling with
   * the code has worked. If they ever diverge, the dropdown would find no
   * option matching the code and paint itself empty while the component still
   * believed a successor was recorded — and the next save could send a PATCH
   * for the wrong institution. Falls back to the code when the candidate list
   * has not loaded yet, which is the behaviour this replaces.
   */
  private toSuccessorOptionId(code: number | null | undefined): number | null {
    if (code == null) {
      return null;
    }
    const match = this.successorOptions.find((option) => Number(option.code) === Number(code));
    return match ? Number(match.id) : Number(code);
  }

  private toOption(row: InstitutionRow): InstitutionOption {
    const suffix = row.acronym ? ` (${row.acronym})` : '';
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      acronym: row.acronym,
      label: `${row.name}${suffix}`,
      // An announced retirement is still a valid successor: only an end date
      // that has already arrived disqualifies it.
      selectable: row.validityStatus !== 'ended'
    };
  }

  /** Parses an ISO yyyy-MM-dd string into a local Date, avoiding timezone drift. */
  /**
   * Keeps the calendar day of a timestamp and drops the time. `added` arrives
   * as an ISO instant (`2016-06-20T07:50:12.000Z`) and only the day is shown,
   * so the string is cut rather than parsed: turning it into a local Date
   * would move it a day for anyone west of UTC.
   */
  private toDayOnly(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
    return match ? match[1] : null;
  }

  private toDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /** Serializes a Date as local yyyy-MM-dd (never UTC-shifted). */
  private toIsoDate(value: Date | string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : this.toDate(String(value));
    if (!date || isNaN(date.getTime())) {
      return null;
    }
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private toastError(err: any): void {
    // The API wraps every error as { response: <nest payload>, message, ... }.
    // For a validation failure the outer `message` is the generic
    // "Bad Request Exception" and the per-field messages live in
    // `response.message`, so the nested one has to be read first — otherwise
    // the admin only ever sees "Bad Request Exception" and cannot tell which
    // field the API refused.
    const nested = err?.error?.response?.message;
    const detail =
      (Array.isArray(nested) ? nested.join(' · ') : nested) ??
      err?.error?.message ??
      (typeof err?.error === 'string' ? err.error : null) ??
      err?.message ??
      'Request failed';
    this.messages.add({
      severity: 'error',
      summary: 'Error',
      detail
    });
  }
}

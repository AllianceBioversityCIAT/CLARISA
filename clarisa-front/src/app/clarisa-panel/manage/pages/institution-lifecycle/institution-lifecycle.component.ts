import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  InstitutionApiResponse,
  InstitutionLifecyclePayload,
  InstitutionLifecycleService,
  InstitutionLineageLink,
  InstitutionRelationType,
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

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private _institutionLifecycleService: InstitutionLifecycleService,
    private messages: MessageService,
  ) {
    this.form = this.fb.group({
      startDate: [null],
      endDate: [null],
      replacedByInstitutionId: [null],
      relationType: ['NEW', Validators.required],
      changeDate: [null],
      note: ['', Validators.maxLength(500)]
    });
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
      startDate: this.toDate(row.startDate),
      endDate: this.toDate(row.endDate),
      replacedByInstitutionId: currentLink ? currentLink.code : null,
      relationType: currentLink?.relationType ?? 'NEW',
      changeDate: this.toDate(currentLink?.changeDate ?? null),
      note: ''
    });
    // Remembered so `submit` can tell a row that never had a successor (nothing
    // to send) from one whose recorded successor was just cleared, which the
    // API only removes when the key travels as an explicit null.
    this.recordedSuccessorId = currentLink ? currentLink.code : null;
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
    const payload: InstitutionLifecyclePayload = {
      startDate: this.toIsoDate(raw.startDate),
      endDate
    };

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

  /** Human readable "replaced by" cell. */
  lineageLabel(links: InstitutionLineageLink[]): string {
    if (!links?.length) {
      return '';
    }
    return links
      .map((link) => {
        const name = link.acronym || link.name || `#${link.code}`;
        return link.relationType ? `${name} (${link.relationType})` : name;
      })
      .join(', ');
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
        ...replacedBy.map((link) => `${link.acronym ?? ''} ${link.name ?? ''}`)
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

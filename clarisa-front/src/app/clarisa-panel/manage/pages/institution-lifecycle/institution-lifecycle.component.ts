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
    this.editVisible = true;
  }

  closeEdit(): void {
    this.editVisible = false;
    this.selected = null;
  }

  /** Successor candidates, excluding the institution being edited. */
  get availableSuccessors(): InstitutionOption[] {
    const currentId = this.selected?.id;
    return currentId
      ? this.successorOptions.filter((option) => option.id !== currentId)
      : this.successorOptions;
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
    const payload: InstitutionLifecyclePayload = {
      startDate: this.toIsoDate(raw.startDate),
      endDate: this.toIsoDate(raw.endDate)
    };

    if (raw.replacedByInstitutionId) {
      payload.replacedByInstitutionId = Number(raw.replacedByInstitutionId);
      payload.relationType = (raw.relationType || 'NEW') as InstitutionRelationType;
      const changeDate = this.toIsoDate(raw.changeDate) ?? this.toIsoDate(raw.endDate);
      if (changeDate) {
        payload.changeDate = changeDate;
      }
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
      validityStatus: raw.validityStatus ?? (endDate ? 'ended' : 'active'),
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

  private toOption(row: InstitutionRow): InstitutionOption {
    const suffix = row.acronym ? ` (${row.acronym})` : '';
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      acronym: row.acronym,
      label: `${row.name}${suffix}`
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
    const detail =
      err?.error?.message ??
      err?.error?.response?.message ??
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

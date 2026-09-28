import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  GlobalConceptsApiService,
  ImportResult,
  ImportRowResult
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GlossaryFileParserService, ParsedTable } from '../../../glossary-admin/services/glossary-file-parser.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { applyAiMatches, buildImportRows, ColumnMapping, confidenceLabel, exactMapping, headerKey, pickField } from '../../utils/column-mapping';
import { IMPORT_FIELDS, REQUIRED_IMPORT_FIELD } from '../../utils/import-fields';

/** Same ceiling as the glossary upload: checked before a byte is parsed. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** What the back's column matcher accepts (`MapColumnsDto`). */
const AI_MAX_COLUMNS = 60;
const AI_SAMPLE_ROWS = 5;
const AI_MAX_HEADER = 200;

type WizardStep = 'source' | 'mapping' | 'review' | 'done';
type ActionFilter = 'all' | ImportRowResult['action'];

export interface ReviewRow extends ImportRowResult {
  changesText: string;
  errorsText: string;
  warningsText: string;
}

@Component({
  selector: 'app-gc-import-panel',
  templateUrl: './gc-import-panel.component.html',
  styleUrls: ['./gc-import-panel.component.scss']
})
export class GcImportPanelComponent implements OnChanges, OnInit {
  @Input() scheme = 'meliaf';
  @Input() aiEnabled = false;
  /** Emitted once rows were written, so the concepts table reloads. */
  @Output() imported = new EventEmitter<void>();
  @Output() openConcepts = new EventEmitter<void>();

  readonly acceptedExtensions = GlossaryFileParserService.ACCEPTED_EXTENSIONS.join(',');
  /** Built-in schema fields, plus the scheme's custom fields as `x:<code>` once they load. */
  fieldOptions: { label: string; value: string; hint: string }[] = IMPORT_FIELDS.map(field => ({ label: field.field, value: field.field, hint: field.hint }));
  /** Header words that name a custom field (its label or code), for the exact match. */
  private customByHeader = new Map<string, string>();
  readonly requiredField = REQUIRED_IMPORT_FIELD;

  step: WizardStep = 'source';

  // --- source ---------------------------------------------------------
  pastedText = '';
  parsing = false;
  table: ParsedTable | null = null;

  // --- mapping --------------------------------------------------------
  mappings: ColumnMapping[] = [];
  /** First two values of each column, computed once per source (the sheet can hold 2000 rows). */
  columnSamples: string[][] = [];
  /** Says which column lost its field when a person moved it to another one. */
  mappingNote: string | null = null;
  aiMapping = false;

  // --- review ---------------------------------------------------------
  previewing = false;
  preview: ImportResult | null = null;
  /** Built once per preview, so the import sends exactly the rows that were reviewed. */
  plannedRows: Record<string, unknown>[] = [];
  reviewRows: ReviewRow[] = [];
  actionFilter: ActionFilter = 'all';
  skipInvalid = false;
  importing = false;
  result: ImportResult | null = null;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _parser: GlossaryFileParserService,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadImportFields();
  }

  /** Custom fields become import columns too (contract v2 §2); a failure leaves the built-in ones. */
  private loadImportFields(): void {
    this._api.importFields(this.scheme).subscribe({
      next: fields => {
        const custom = (fields ?? []).filter(f => f.custom);
        this.customByHeader = new Map();
        for (const f of custom) {
          const code = f.field.replace(/^x:/, '');
          this.customByHeader.set(headerKey(code), f.field);
          this.customByHeader.set(headerKey(f.field), f.field);
          const label = /^(.*) \(custom field/.exec(f.hint)?.[1];
          if (label) this.customByHeader.set(headerKey(label), f.field);
        }
        this.fieldOptions = [
          ...IMPORT_FIELDS.map(field => ({ label: field.field, value: field.field, hint: field.hint })),
          ...custom.map(f => ({ label: f.field, value: f.field, hint: f.hint }))
        ];
      },
      error: () => undefined
    });
  }

  /** Exact match for custom fields too, one column per field, never over a built-in match. */
  private withCustomFields(mappings: ColumnMapping[]): ColumnMapping[] {
    const taken = new Set(mappings.map(m => m.field).filter(Boolean));
    return mappings.map(m => {
      if (m.field) return m;
      const custom = this.customByHeader.get(headerKey(m.header));
      if (!custom || taken.has(custom)) return m;
      taken.add(custom);
      return { ...m, field: custom, source: 'exact', confidence: 1 };
    });
  }

  /** A preview belongs to one scheme: switching scheme sends the wizard back to the mapping. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheme'] && !changes['scheme'].firstChange) this.loadImportFields();
    if (changes['scheme'] && !changes['scheme'].firstChange && this.step === 'review') {
      this.backToMapping();
    }
  }

  // ------------------------------------------------------------- step 1

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      this._messageService.add({
        severity: 'warn',
        summary: 'File too large',
        detail: `${file.name} is over 15 MB. Export only the sheet with the concepts, or paste the rows instead.`
      });
      input.value = '';
      return;
    }

    await this.readSource(() => this._parser.parseFile(file));
    input.value = '';
  }

  async usePastedText(): Promise<void> {
    await this.readSource(async () => this._parser.parseText(this.pastedText));
  }

  async readSource(read: () => Promise<ParsedTable>): Promise<void> {
    this.parsing = true;
    try {
      const table = await read();
      this.table = table;
      this.mappings = this.withCustomFields(exactMapping(table.headers));
      this.columnSamples = table.headers.map((_, column) =>
        table.rows
          .map(row => (row[column] ?? '').trim())
          .filter(Boolean)
          .slice(0, 2)
      );
      this.mappingNote = null;
      this.step = 'mapping';
      this._messageService.add({ severity: 'success', summary: 'Content read', detail: `${table.rows.length} row(s) in ${table.sourceName}` });
    } catch (error) {
      this.toastError(error);
    } finally {
      this.parsing = false;
    }
  }

  // ------------------------------------------------------------- step 2

  /** True when the first line of the source was a header, so data starts on line 2. */
  get headerRow(): boolean {
    return !!this.table && this.table.generatedHeaders.some(generated => !generated);
  }

  get mappedCount(): number {
    return this.mappings.filter(mapping => mapping.field).length;
  }

  get mappingError(): string | null {
    if (!this.mappings.some(mapping => mapping.field === REQUIRED_IMPORT_FIELD)) {
      return `Map one column to ${REQUIRED_IMPORT_FIELD}: a row without it cannot be imported.`;
    }
    return null;
  }

  samples(column: number): string[] {
    return this.columnSamples[column] ?? [];
  }

  hintFor(field: string | null): string {
    return this.fieldOptions.find(option => option.value === field)?.hint ?? '';
  }

  badge(mapping: ColumnMapping): string | null {
    return confidenceLabel(mapping);
  }

  trackByColumn(_: number, mapping: ColumnMapping): number {
    return mapping.column;
  }

  onPick(column: number, field: string | null): void {
    const { mappings, clearedFrom } = pickField(this.mappings, column, field ?? null);
    this.mappings = mappings;
    const header = mappings.find(mapping => mapping.column === column)?.header ?? '';
    this.mappingNote = clearedFrom && field ? `${field} moved from “${clearedFrom}” to “${header}”. A field can hold only one column.` : null;
  }

  autoMatch(): void {
    if (!this.table || !this.aiEnabled || this.aiMapping) return;

    const headers = this.table.headers.slice(0, AI_MAX_COLUMNS).map(header => header.slice(0, AI_MAX_HEADER));
    const rows = this.table.rows.slice(0, AI_SAMPLE_ROWS).map(row => row.slice(0, AI_MAX_COLUMNS));

    this.aiMapping = true;
    this._api.aiMapColumns(headers, rows).subscribe({
      next: response => {
        this.aiMapping = false;
        const { mappings, filled } = applyAiMatches(this.mappings, response?.columns ?? []);
        this.mappings = mappings;
        this.mappingNote = null;
        this._messageService.add({
          severity: filled ? 'success' : 'info',
          summary: 'Auto-match with AI',
          detail: filled
            ? `${filled} column(s) suggested. Check each one — every selector can still be changed by hand.`
            : 'No new suggestion: the remaining columns do not match any field.'
        });
      },
      error: error => {
        this.aiMapping = false;
        this.toastError(error);
      }
    });
  }

  runPreview(): void {
    if (!this.table || this.mappingError || this.previewing) return;

    const rows = buildImportRows(this.table.rows, this.mappings, this.headerRow, this.table.sourceLines);
    if (!rows.length) {
      this._messageService.add({ severity: 'warn', summary: 'Nothing to import', detail: 'Every row is empty in the mapped columns.' });
      return;
    }

    this.previewing = true;
    const scheme = this.scheme;
    this._api.importPreview(scheme, rows).subscribe({
      next: preview => {
        this.previewing = false;
        // The scheme changed while the preview was in flight: it no longer describes what would be written.
        if (scheme !== this.scheme) return;
        this.plannedRows = rows;
        this.preview = preview;
        this.actionFilter = 'all';
        this.skipInvalid = false;
        this.applyActionFilter();
        this.step = 'review';
      },
      error: error => {
        this.previewing = false;
        this.toastError(error);
      }
    });
  }

  // ------------------------------------------------------------- step 3

  get actionFilterOptions(): { label: string; value: ActionFilter }[] {
    const count = (action: ImportRowResult['action']) => (this.preview?.rows ?? []).filter(row => row.action === action).length;
    return [
      { label: `All rows (${this.preview?.rows?.length ?? 0})`, value: 'all' },
      { label: `To create (${count('create')})`, value: 'create' },
      { label: `To update (${count('update')})`, value: 'update' },
      { label: `Unchanged (${count('skip')})`, value: 'skip' },
      { label: `Invalid (${count('invalid')})`, value: 'invalid' }
    ];
  }

  applyActionFilter(): void {
    const rows = this.preview?.rows ?? [];
    this.reviewRows = rows
      .filter(row => this.actionFilter === 'all' || row.action === this.actionFilter)
      .map(row => ({
        ...row,
        changesText: (row.changes ?? []).join(', '),
        errorsText: (row.errors ?? []).join(' · '),
        warningsText: (row.warnings ?? []).join(' · ')
      }));
  }

  get invalidCount(): number {
    return this.preview?.summary?.invalid ?? 0;
  }

  get writableCount(): number {
    const summary = this.preview?.summary;
    return summary ? summary.to_create + summary.to_update : 0;
  }

  get canImport(): boolean {
    return !!this.preview && this.writableCount > 0 && (this.invalidCount === 0 || this.skipInvalid);
  }

  confirmImport(): void {
    if (!this.canImport || this.importing) return;
    const summary = this.preview?.summary;

    this._confirmationService.confirm({
      header: 'Import these concepts?',
      message:
        `${summary?.to_create ?? 0} will be created and ${summary?.to_update ?? 0} updated in one go — all or nothing.` +
        (this.invalidCount && this.skipInvalid ? ` ${this.invalidCount} invalid row(s) will be skipped.` : '') +
        ' Every write is logged as an import under your name.',
      acceptLabel: 'Import',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'btn-brand',
      rejectButtonStyleClass: 'btn-ghost',
      accept: () => this.runImport()
    });
  }

  runImport(): void {
    this.importing = true;
    this._api.importRows(this.scheme, this.plannedRows, this.skipInvalid).subscribe({
      next: result => {
        this.importing = false;
        this.result = result;
        this.step = 'done';
        this._messageService.add({
          severity: 'success',
          summary: 'Concepts imported',
          detail: `${result?.summary?.to_create ?? 0} created, ${result?.summary?.to_update ?? 0} updated`
        });
        this.imported.emit();
      },
      error: error => {
        this.importing = false;
        this.toastError(error);
      }
    });
  }

  // ------------------------------------------------------------- shared

  backToSource(): void {
    this.step = 'source';
    this.preview = null;
  }

  backToMapping(): void {
    this.step = 'mapping';
    this.preview = null;
    this.plannedRows = [];
  }

  startOver(): void {
    this.step = 'source';
    this.table = null;
    this.pastedText = '';
    this.mappings = [];
    this.columnSamples = [];
    this.mappingNote = null;
    this.preview = null;
    this.plannedRows = [];
    this.reviewRows = [];
    this.result = null;
    this.actionFilter = 'all';
    this.skipInvalid = false;
  }

  actionLabel(action: string): string {
    switch (action) {
      case 'create':
        return 'New';
      case 'update':
        return 'Update';
      case 'skip':
        return 'Unchanged';
      default:
        return 'Invalid';
    }
  }

  actionSeverity(action: string): string {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'skip':
        return 'warning';
      default:
        return 'danger';
    }
  }

  private toastError(error: unknown): void {
    this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error) });
  }
}

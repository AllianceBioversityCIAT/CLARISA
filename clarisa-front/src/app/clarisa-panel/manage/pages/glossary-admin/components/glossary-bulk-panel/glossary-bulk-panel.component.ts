import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  GlossaryBulkBody,
  GlossaryBulkConflictPolicy,
  GlossaryBulkResult,
  GlossaryBulkRow,
  GlossaryBulkRowAction,
  GlossaryBulkRowResult,
  ManageApiService
} from '../../../../services/manage-api.service';
import { GlossaryFileParserService, ParsedTable } from '../../services/glossary-file-parser.service';
import { matchDropdownPanelToTrigger } from '../../../../utils/dropdown-panel-width';
import { apiErrorMessage } from '../../utils/api-error-message';
import { buildColumnOptions, ColumnOption, MAX_GENERATED_COLUMN_OPTIONS } from '../../utils/column-options';

/**
 * Hard ceiling for an uploaded spreadsheet, checked before parsing. The API
 * caps the batch at 2000 rows, which is a few hundred KB of text.
 */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type WizardStep = 'source' | 'mapping' | 'review' | 'done';

@Component({
  selector: 'app-glossary-bulk-panel',
  templateUrl: './glossary-bulk-panel.component.html',
  styleUrls: ['./glossary-bulk-panel.component.scss']
})
export class GlossaryBulkPanelComponent implements OnInit {
  /** Emitted once the import succeeds, so the terms table can reload. */
  @Output() imported = new EventEmitter<void>();

  readonly acceptedExtensions = GlossaryFileParserService.ACCEPTED_EXTENSIONS.join(',');

  step: WizardStep = 'source';

  // --- source ---------------------------------------------------------
  pastedText = '';
  parsing = false;
  table: ParsedTable | null = null;

  // --- mapping --------------------------------------------------------
  columnOptions: ColumnOption[] = [];
  /** Unnamed columns left out of the pickers, reported to the user. */
  hiddenColumnCount = 0;
  readonly maxGeneratedColumns = MAX_GENERATED_COLUMN_OPTIONS;
  termColumn: number | null = null;
  definitionColumn: number | null = null;
  /**
   * Optional provenance columns. `null` means the file does not carry one, and
   * the import then says nothing about that field — it never clears a source
   * already stored (see the service's bulk update).
   */
  sourceColumn: number | null = null;
  sourceUrlColumn: number | null = null;
  referenceDateColumn: number | null = null;
  selectedPortfolioIds: number[] = [];
  conflictPolicy: GlossaryBulkConflictPolicy = 'update';
  showInDashboard = false;
  portfolioOptions: { label: string; value: number }[] = [];

  readonly conflictOptions = [
    { label: 'Update the existing definition', value: 'update' as GlossaryBulkConflictPolicy },
    { label: 'Keep the existing one (skip)', value: 'skip' as GlossaryBulkConflictPolicy }
  ];

  // --- review ---------------------------------------------------------
  previewing = false;
  importing = false;
  preview: GlossaryBulkResult | null = null;
  result: GlossaryBulkResult | null = null;
  actionFilter: 'all' | GlossaryBulkRowAction = 'all';

  readonly actionFilterOptions = [
    { label: 'All rows', value: 'all' },
    { label: 'To create', value: 'create' },
    { label: 'To update', value: 'update' },
    { label: 'To reactivate', value: 'reactivate' },
    { label: 'Skipped', value: 'skip' },
    { label: 'With errors', value: 'invalid' }
  ];

  constructor(
    private readonly _manageApiService: ManageApiService,
    private readonly _parser: GlossaryFileParserService,
    private readonly _messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadPortfolios();
  }

  private loadPortfolios(): void {
    this._manageApiService.getAllPortfolios().subscribe({
      next: (response: any) => {
        const list = Array.isArray(response) ? response : [];
        // The portfolios endpoint returns a BasicDto, so the id travels as `code`.
        this.portfolioOptions = list.map(portfolio => {
          const closed = portfolio.is_active === false || portfolio.is_active === 0;
          const name = portfolio.acronym ? `${portfolio.acronym} — ${portfolio.name}` : portfolio.name;
          return {
            label: closed ? `${name} (closed)` : name,
            value: Number(portfolio.code ?? portfolio.id)
          };
        });
      },
      error: error => this.toastError(error)
    });
  }

  // ------------------------------------------------------------- step 1

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    // Checked before reading a single byte. The row cap lives in the API DTO
    // and the sheet is parsed in this tab, so a very large file froze the
    // browser long before anything could tell the user it was too big. A
    // glossary upload of the maximum 2000 rows weighs a few hundred KB, so this
    // ceiling only ever catches a file that was never going to work.
    if (file.size > MAX_UPLOAD_BYTES) {
      this._messageService.add({
        severity: 'warn',
        summary: 'File too large',
        detail: `${file.name} weighs ${this.asMegabytes(file.size)} MB. The limit is ${this.asMegabytes(
          MAX_UPLOAD_BYTES
        )} MB — export just the glossary sheet, or paste the rows instead.`
      });
      input.value = '';
      return;
    }

    await this.readSource(() => this._parser.parseFile(file));
    // Allow re-selecting the same file after a failed attempt.
    input.value = '';
  }

  private asMegabytes(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  async usePastedText(): Promise<void> {
    await this.readSource(async () => this._parser.parseText(this.pastedText));
  }

  private async readSource(read: () => Promise<ParsedTable>): Promise<void> {
    this.parsing = true;
    try {
      const table = await read();
      this.table = table;

      const detected = this._parser.detectColumns(table.headers);
      this.termColumn = detected.termIndex >= 0 ? detected.termIndex : null;
      this.definitionColumn = detected.definitionIndex >= 0 ? detected.definitionIndex : null;
      this.sourceColumn = detected.sourceIndex >= 0 ? detected.sourceIndex : null;
      this.sourceUrlColumn = detected.sourceUrlIndex >= 0 ? detected.sourceUrlIndex : null;
      this.referenceDateColumn = detected.referenceDateIndex >= 0 ? detected.referenceDateIndex : null;

      const columns = buildColumnOptions(table, [
        this.termColumn,
        this.definitionColumn,
        this.sourceColumn,
        this.sourceUrlColumn,
        this.referenceDateColumn
      ]);
      this.columnOptions = columns.options;
      this.hiddenColumnCount = columns.hiddenCount;

      this.step = 'mapping';
      this._messageService.add({
        severity: 'success',
        summary: 'Content read',
        detail: `${table.rows.length} row(s) detected in ${table.sourceName}`
      });
    } catch (error: any) {
      this.toastError(error);
    } finally {
      this.parsing = false;
    }
  }

  /** Downloads a two-column starter file so nobody has to guess the format. */
  downloadTemplate(): void {
    const csv = [
      'term,definition,source,source url,reference date',
      '"Impact Area","One of the five CGIAR areas where impact is pursued.","CGIAR 2025-2030 Portfolio Narrative","https://www.cgiar.org/","2025-01-15"',
      '"Initiative","A CGIAR research portfolio investment.","CGIAR Research Initiatives",,"2022-03-01"'
    ].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clarisa-glossary-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------- step 2

  /** Columns the file declared but that carry no header and no value at all. */
  get emptyColumnCount(): number {
    return this.table ? this.table.sourceColumns - this.table.headers.length : 0;
  }

  get mappingReady(): boolean {
    return this.termColumn !== null && this.definitionColumn !== null && this.termColumn !== this.definitionColumn;
  }

  get mappingError(): string | null {
    if (this.termColumn === null || this.definitionColumn === null) {
      return 'Pick which column holds the term and which one holds the definition.';
    }
    if (this.termColumn === this.definitionColumn) {
      return 'The term and the definition cannot be the same column.';
    }
    return null;
  }

  /** First rows rendered as they will be sent, so the mapping can be checked. */
  get mappingPreviewRows(): { term: string; definition: string }[] {
    if (!this.table || !this.mappingReady) {
      return [];
    }
    return this.table.rows.slice(0, 5).map(row => ({
      term: row[this.termColumn as number] ?? '',
      definition: row[this.definitionColumn as number] ?? ''
    }));
  }

  /**
   * Trims a reference date to the calendar day the API expects.
   *
   * Only the unambiguous shapes are converted: an Excel date cell already
   * reaches here as `YYYY-MM-DD` (the parser formats it), and an ISO timestamp
   * is cut at the day. Anything else — `07/09/2026`, `Sept 2026`, a bare year —
   * is passed through untouched on purpose: `07/09/2026` is 7 September for
   * whoever typed it in Cali and 9 July for a US locale, and guessing wrong
   * writes a plausible date nobody would ever notice. The preview flags the
   * row instead, naming the value, so the file gets fixed at the source.
   */
  private normalizeReferenceDate(value: string | null | undefined): string {
    const raw = (value ?? '').trim();
    const isoTimestamp = /^(\d{4}-\d{2}-\d{2})[T ]/.exec(raw);
    return isoTimestamp ? isoTimestamp[1] : raw;
  }

  private buildBody(): GlossaryBulkBody {
    const rows: GlossaryBulkRow[] = (this.table?.rows ?? []).map(row => ({
      term: row[this.termColumn as number] ?? '',
      definition: row[this.definitionColumn as number] ?? '',
      ...(this.sourceColumn !== null ? { source: row[this.sourceColumn] ?? '' } : {}),
      ...(this.sourceUrlColumn !== null ? { source_url: row[this.sourceUrlColumn] ?? '' } : {}),
      ...(this.referenceDateColumn !== null ? { reference_date: this.normalizeReferenceDate(row[this.referenceDateColumn]) } : {})
    }));

    return {
      rows,
      portfolio_ids: this.selectedPortfolioIds ?? [],
      on_conflict: this.conflictPolicy,
      show_in_dashboard: this.showInDashboard
    };
  }

  runPreview(): void {
    if (!this.mappingReady || !this.table) {
      return;
    }

    this.previewing = true;
    this._manageApiService.previewGlossaryBulk(this.buildBody()).subscribe({
      next: response => {
        this.previewing = false;
        this.preview = response;
        this.actionFilter = 'all';
        this.step = 'review';
      },
      error: error => {
        this.previewing = false;
        this.toastError(error);
      }
    });
  }

  // ------------------------------------------------------------- step 3

  get reviewRows(): GlossaryBulkRowResult[] {
    const rows = this.preview?.rows ?? [];
    if (this.actionFilter === 'all') {
      return rows;
    }
    return rows.filter(row => row.action === this.actionFilter);
  }

  get hasInvalidRows(): boolean {
    return (this.preview?.summary?.invalid ?? 0) > 0;
  }

  get writableCount(): number {
    const summary = this.preview?.summary;
    return summary ? summary.to_create + summary.to_update + summary.to_reactivate : 0;
  }

  get hasWritableRows(): boolean {
    return this.writableCount > 0;
  }

  /** Reactivating a hidden term is worth warning about before confirming. */
  get hasReactivations(): boolean {
    return (this.preview?.summary?.to_reactivate ?? 0) > 0;
  }

  confirmImport(): void {
    if (!this.preview || this.hasInvalidRows || !this.hasWritableRows) {
      return;
    }

    this.importing = true;
    this._manageApiService.importGlossaryBulk(this.buildBody()).subscribe({
      next: response => {
        this.importing = false;
        this.result = response;
        this.step = 'done';
        this._messageService.add({
          severity: 'success',
          summary: 'Glossary updated',
          detail: `${response.summary.to_create} created, ${response.summary.to_update} updated`
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
  }

  startOver(): void {
    this.step = 'source';
    this.table = null;
    this.preview = null;
    this.result = null;
    this.pastedText = '';
    this.columnOptions = [];
    this.hiddenColumnCount = 0;
    this.termColumn = null;
    this.definitionColumn = null;
    this.sourceColumn = null;
    this.sourceUrlColumn = null;
    this.referenceDateColumn = null;
    this.selectedPortfolioIds = [];
    this.conflictPolicy = 'update';
    this.showInDashboard = false;
    this.actionFilter = 'all';
  }

  onDropdownShow(event: any): void {
    matchDropdownPanelToTrigger(event);
  }

  actionLabel(action: string): string {
    switch (action) {
      case 'create':
        return 'New';
      case 'update':
        return 'Update';
      case 'reactivate':
        return 'Reactivate';
      case 'skip':
        return 'Skipped';
      default:
        return 'Error';
    }
  }

  actionSeverity(action: string): string {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'reactivate':
      case 'skip':
        return 'warning';
      default:
        return 'danger';
    }
  }

  get selectedPortfolioLabels(): string[] {
    return this.portfolioOptions.filter(option => this.selectedPortfolioIds.includes(option.value)).map(option => option.label);
  }

  private toastError(error: any): void {
    this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error) });
  }
}

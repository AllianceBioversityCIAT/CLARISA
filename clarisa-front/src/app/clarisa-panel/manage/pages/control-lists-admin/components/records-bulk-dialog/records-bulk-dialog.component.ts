import { Component, Input, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow, ListRecord } from '../../models/control-lists.models';
import { BulkCell, BulkParse, BulkRow, examplePaste, parseBulk } from '../../utils/bulk-records';
import { foldText } from '../../utils/field-types';
import { BULK_MAX_TEXT_BYTES, MAX_BULK_RECORDS } from '../../utils/limits';
import { isOn } from '../../utils/record-values';
import { WriteDialogBase } from '../write-dialog.base';

const EMPTY: BulkParse = {
  rows: [],
  headerDetected: false,
  headerSkipped: false,
  header: null,
  ready: 0,
  withProblems: 0,
  overLimit: false,
  tooMuchText: false,
  records: []
};

const records = (n: number): string => `${n} ${n === 1 ? 'record' : 'records'}`;

/** «Add several records»: rows pasted from a spreadsheet, checked cell by cell, sent all at once. */
@Component({
  selector: 'app-cl-records-bulk-dialog',
  templateUrl: './records-bulk-dialog.component.html',
  styleUrls: ['./records-bulk-dialog.component.scss']
})
export class RecordsBulkDialogComponent extends WriteDialogBase<{ created: number }> {
  @Input() code = '';
  /** Published fields, in position order: the order of the columns. */
  @Input() fields: FieldRow[] = [];
  /** Records of each related list by its code; `null` when that list could not be read. */
  @Input() related: Record<string, ListRecord[] | null> = {};
  /** The records already in the list, active and inactive: a unique value they hold cannot be pasted again. */
  @Input() existing: ListRecord[] = [];

  readonly max = MAX_BULK_RECORDS;
  readonly isOn = isOn;
  text = '';
  parsed: BulkParse = EMPTY;
  onlyProblems = false;
  placeholder = '';
  /** The person's own answer to «The first line is a header»; `null` = follow the detection. */
  headerChoice: boolean | null = null;
  readonly maxTextMb = BULK_MAX_TEXT_BYTES / 1_000_000;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.text = '';
    this.parsed = EMPTY;
    this.onlyProblems = false;
    this.headerChoice = null;
    this.placeholder = examplePaste(this.fields, this.related);
  }

  /** The fields, the options or the records already in the list changed under the open dialog: read the paste again. */
  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['visible'] || !this.visible) return;
    if (changes['fields'] || changes['related'] || changes['existing']) {
      this.placeholder = examplePaste(this.fields, this.related);
      this.reparse();
    }
  }

  /** Read again on every change of the text: the preview and the button follow it. */
  onTextChange(): void {
    // An emptied box starts over: the header box follows the next paste again.
    if (this.text.trim() === '') this.headerChoice = null;
    this.reparse();
  }

  /** What «The first line is a header» shows: the person's choice, else the detection. */
  get headerOn(): boolean {
    return this.headerChoice ?? this.parsed.headerDetected;
  }

  setHeader(on: boolean): void {
    this.headerChoice = on;
    this.reparse();
  }

  private reparse(): void {
    this.parsed = parseBulk(this.text, this.fields, this.related, this.existing, this.headerChoice);
    if (!this.parsed.withProblems) this.onlyProblems = false;
  }

  /** At least one line pasted (the header included): the header box shows. */
  get hasLines(): boolean {
    return this.text.trim() !== '';
  }

  get count(): number {
    return this.parsed.rows.length;
  }

  get summary(): string {
    const p = this.parsed;
    // Over the limit nothing is "ready": none of it can be sent as it is.
    if (p.overLimit || p.tooMuchText) return `${records(this.count)} pasted`;
    return p.withProblems ? `${p.ready} ready · ${p.withProblems} with problems` : `${records(p.ready)} ready`;
  }

  /** The summary carries the warning mark: rows with problems, or more rows than one request takes. */
  get blocked(): boolean {
    return this.parsed.withProblems > 0 || this.tooBig;
  }

  /** More than one request takes (rows or text): only the summary and the limit show, never the rows. */
  get tooBig(): boolean {
    return this.parsed.overLimit || this.parsed.tooMuchText;
  }

  get visibleRows(): BulkRow[] {
    return this.onlyProblems ? this.parsed.rows.filter(r => r.hasProblem) : this.parsed.rows;
  }

  get canSubmit(): boolean {
    return !this.saving && this.count > 0 && this.parsed.withProblems === 0 && !this.tooBig;
  }

  /** The count only when those rows can be sent; with problems or over a limit the button is just «Add records». */
  get submitLabel(): string {
    if (this.saving) return 'Adding…';
    return this.canSubmit ? `Add ${records(this.count)}` : 'Add records';
  }

  /** The value to read in the preview differs from what was pasted by more than case or accents. */
  converted(cell: BulkCell): boolean {
    return !cell.problem && cell.text !== '' && foldText(cell.shown) !== foldText(cell.text);
  }

  protected override isDirty(): boolean {
    return this.text.trim() !== '';
  }

  trackRow(_: number, row: BulkRow): number {
    return row.n;
  }

  submit(): void {
    // The text may have changed since the last preview (a paste the model has not reported yet): read it once more.
    this.reparse();
    if (!this.canSubmit) return;
    const rows = this.parsed.records;
    const sent = rows.length;
    this.write(
      () => this.api.createRecords(this.code, { request_id: this.requestIdFor({ code: this.code, records: rows }), records: rows }),
      result => {
        const n = typeof result?.created === 'number' ? result.created : sent;
        this.success(`${records(n)} added`, n === 1 ? 'It is active in the list now.' : 'They are active in the list now.');
      }
    );
  }
}

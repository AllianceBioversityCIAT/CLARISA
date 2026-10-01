import { of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GlobalConceptsApiService, ImportResult } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GlossaryFileParserService, ParsedTable } from '../../../glossary-admin/services/glossary-file-parser.service';
import { GcImportPanelComponent } from './gc-import-panel.component';

describe('GcImportPanelComponent', () => {
  const table: ParsedTable = {
    headers: ['TERM ID', 'TERM', 'definition'],
    rows: [
      ['1', 'Outcome', 'A change'],
      ['', 'Output', '']
    ],
    sourceName: 'concepts.xlsx',
    generatedHeaders: [false, false, false],
    sourceColumns: 3
  };
  const preview: ImportResult = {
    applied: false,
    summary: { total: 2, to_create: 1, to_update: 0, unchanged: 0, invalid: 1, with_warnings: 0 },
    rows: [
      { row: 2, action: 'create', term_id: 1, preferred_label: 'Outcome', changes: ['definition'], errors: [], warnings: [] },
      { row: 3, action: 'invalid', term_id: null, preferred_label: 'Output', changes: [], errors: ['No definition'], warnings: [] }
    ]
  };

  let api: Record<string, jest.Mock>;
  let confirm: jest.Mock;
  let component: GcImportPanelComponent;

  beforeEach(async () => {
    api = {
      aiMapColumns: jest.fn(() =>
        of({ columns: [{ column: 1, header: 'TERM', field: 'preferred_label', confidence: 0.91, source: 'ai' }], fields: [] })
      ),
      importPreview: jest.fn(() => of(preview)),
      importRows: jest.fn(() => of({ ...preview, applied: true }))
    };
    confirm = jest.fn(({ accept }) => accept());
    component = new GcImportPanelComponent(
      api as unknown as GlobalConceptsApiService,
      {} as GlossaryFileParserService,
      { add: jest.fn() } as unknown as MessageService,
      { confirm } as unknown as ConfirmationService
    );
    await component.readSource(async () => table);
  });

  it('pre-fills exact headers and asks for the preferred label before previewing', () => {
    expect(component.step).toBe('mapping');
    expect(component.mappings.map(m => m.field)).toEqual(['term_id', null, 'definition']);
    expect(component.mappingError).toContain('preferred_label');
  });

  it('does not call the AI when it is disabled', () => {
    component.aiEnabled = false;
    component.autoMatch();

    expect(api['aiMapColumns']).not.toHaveBeenCalled();
  });

  it('fills the free columns with AI, sending headers and at most 5 rows', () => {
    component.aiEnabled = true;
    component.autoMatch();

    expect(api['aiMapColumns']).toHaveBeenCalledWith(table.headers, table.rows);
    expect(component.mappings[1]).toEqual(expect.objectContaining({ field: 'preferred_label', source: 'ai', confidence: 0.91 }));
    expect(component.badge(component.mappings[1])).toBe('AI 0.91');
    expect(component.aiMapping).toBe(false);
  });

  it('says which column lost its field on a manual pick', () => {
    component.onPick(1, 'definition');

    expect(component.mappings[2].field).toBeNull();
    expect(component.mappingNote).toContain('definition');
  });

  it('previews the built rows and imports exactly those, skipping invalid ones when asked', () => {
    const emitted = jest.fn();
    component.imported.subscribe(emitted);
    component.onPick(1, 'preferred_label');
    component.runPreview();

    const rows = [
      { term_id: '1', preferred_label: 'Outcome', definition: 'A change', __row: 2 },
      { preferred_label: 'Output', __row: 3 }
    ];
    expect(api['importPreview']).toHaveBeenCalledWith('meliaf-taxonomy', rows);
    expect(component.step).toBe('review');
    expect(component.canImport).toBe(false);

    component.skipInvalid = true;
    component.confirmImport();

    expect(api['importRows']).toHaveBeenCalledWith('meliaf-taxonomy', rows, true);
    expect(component.step).toBe('done');
    expect(emitted).toHaveBeenCalled();
  });

  it('filters the preview by action', () => {
    component.onPick(1, 'preferred_label');
    component.runPreview();
    component.actionFilter = 'invalid';
    component.applyActionFilter();

    expect(component.reviewRows.map(row => row.row)).toEqual([3]);
    expect(component.reviewRows[0].errorsText).toBe('No definition');
  });

  it('stops the spinner when the preview fails', () => {
    api['importPreview'].mockReturnValueOnce(throwError(() => ({ error: { message: 'Unknown scheme "x"' } })));
    component.onPick(1, 'preferred_label');
    component.runPreview();

    expect(component.previewing).toBe(false);
    expect(component.step).toBe('mapping');
  });

  it('matches a custom field by the label the back sends, not by parsing its free-text hint', async () => {
    api['importFields'] = jest.fn(() =>
      of([{ field: 'x:owner', label: 'Owner team', hint: 'Who answers for the term', custom: true, type: 'text', list_code: null }])
    );
    component.ngOnInit();
    await component.readSource(async () => ({ ...table, headers: ['definition', 'Owner team'], rows: [['A change', 'MEL']], generatedHeaders: [false, false], sourceColumns: 2 }));

    expect(component.mappings.map(m => m.field)).toEqual(['definition', 'x:owner']);
  });
});

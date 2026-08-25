import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { GlossaryBulkPanelComponent } from './glossary-bulk-panel.component';
import { GlossaryFileParserService } from '../../services/glossary-file-parser.service';
import { ManageApiService } from '../../../../services/manage-api.service';
import { MAX_GENERATED_COLUMN_OPTIONS } from '../../utils/column-options';

describe('GlossaryBulkPanelComponent', () => {
  let component: GlossaryBulkPanelComponent;

  const apiService = { getAllPortfolios: () => of([]) } as unknown as ManageApiService;
  const messageService = { add: jest.fn() } as unknown as MessageService;

  beforeEach(() => {
    component = new GlossaryBulkPanelComponent(apiService, new GlossaryFileParserService(), messageService);
  });

  /** Pastes `text` through the real parser, the way the wizard does. */
  const paste = async (text: string) => {
    component.pastedText = text;
    await component.usePastedText();
  };

  it('offers one option per column of a normal paste', async () => {
    await paste('term\tdefinition\nOutcome\tA change');

    expect(component.step).toBe('mapping');
    expect(component.columnOptions).toEqual([
      { label: 'term', value: 0 },
      { label: 'definition', value: 1 }
    ]);
    expect(component.hiddenColumnCount).toBe(0);
    expect(component.termColumn).toBe(0);
    expect(component.definitionColumn).toBe(1);
  });

  it('reports the empty columns an Excel export drags along instead of listing them', async () => {
    const padding = '\t'.repeat(400);
    await paste(`term\tdefinition${padding}\nOutcome\tA change${padding}`);

    expect(component.columnOptions).toHaveLength(2);
    expect(component.emptyColumnCount).toBe(400);
    expect(component.hiddenColumnCount).toBe(0);
  });

  it('caps the unnamed columns that do carry stray data and says how many were hidden', async () => {
    // 30 columns with no title in the header row but a value in the data row.
    const stray = Array.from({ length: 30 }, (_, i) => `x${i}`).join('\t');
    await paste(`term\tdefinition${'\t'.repeat(30)}\nOutcome\tA change\t${stray}`);

    expect(component.columnOptions).toHaveLength(2 + MAX_GENERATED_COLUMN_OPTIONS);
    expect(component.hiddenColumnCount).toBe(10);
    // The mapping still points at the real columns, and no data was dropped.
    expect(component.mappingReady).toBe(true);
    expect(component.mappingPreviewRows).toEqual([{ term: 'Outcome', definition: 'A change' }]);
  });

  it('clears the column state when a new batch is started', async () => {
    await paste('term\tdefinition\nOutcome\tA change');
    component.startOver();

    expect(component.columnOptions).toEqual([]);
    expect(component.hiddenColumnCount).toBe(0);
    expect(component.emptyColumnCount).toBe(0);
  });
});

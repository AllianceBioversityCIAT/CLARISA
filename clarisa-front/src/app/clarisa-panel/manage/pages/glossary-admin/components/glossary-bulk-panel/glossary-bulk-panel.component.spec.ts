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

  /**
   * Alternative labels travel as the raw cell, and only when the column was
   * mapped: an absent key is what tells the API to keep the stored labels.
   */
  describe('alternative labels column', () => {
    const lastBody = (preview: jest.Mock) => preview.mock.calls[preview.mock.calls.length - 1][0];
    let previewGlossaryBulk: jest.Mock;

    beforeEach(() => {
      previewGlossaryBulk = jest.fn(() => of({ rows: [], summary: {}, applied: false }));
      component = new GlossaryBulkPanelComponent(
        { getAllPortfolios: () => of([]), previewGlossaryBulk } as unknown as ManageApiService,
        new GlossaryFileParserService(),
        messageService
      );
    });

    it('sends the cell untouched when the column is mapped', async () => {
      await paste('term\tdefinition\talternative labels\nImpact assessment\tA study\tIA; Impact study | old name');

      expect(component.alternativeLabelsColumn).toBe(2);
      component.runPreview();

      expect(lastBody(previewGlossaryBulk).rows[0]).toEqual({
        term: 'Impact assessment',
        definition: 'A study',
        alternative_labels: 'IA; Impact study | old name'
      });
    });

    it('sends an empty cell as an empty string, so the row clears its labels', async () => {
      await paste('term\tdefinition\talternative labels\nImpact assessment\tA study\t');
      component.runPreview();

      expect(lastBody(previewGlossaryBulk).rows[0].alternative_labels).toBe('');
    });

    it('leaves the key out when the column is not mapped', async () => {
      await paste('term\tdefinition\tnotes\nImpact assessment\tA study\tIA');

      expect(component.alternativeLabelsColumn).toBeNull();
      component.runPreview();

      expect('alternative_labels' in lastBody(previewGlossaryBulk).rows[0]).toBe(false);
    });

    it('leaves the key out once the reader clears a detected column', async () => {
      await paste('term\tdefinition\tsynonyms\nImpact assessment\tA study\tIA');
      component.alternativeLabelsColumn = null;
      component.runPreview();

      expect('alternative_labels' in lastBody(previewGlossaryBulk).rows[0]).toBe(false);
    });

    it('forgets the mapping when the wizard starts over', async () => {
      await paste('term\tdefinition\talternative labels\nImpact assessment\tA study\tIA');
      component.startOver();

      expect(component.alternativeLabelsColumn).toBeNull();
    });
  });

  /**
   * The review table is sortable, and the table orders the very array it is
   * given. Handing it a new array on every change detection cycle would put the
   * rows back in file order a moment after the reader clicked a column.
   */
  describe('rows of the review table', () => {
    const rows = [
      { index: 2, action: 'create', term: 'Outcome', definition: 'A change' },
      { index: 3, action: 'invalid', term: '', definition: '' }
    ];

    beforeEach(() => {
      component.preview = { rows, summary: {} } as any;
      component.actionFilter = 'all';
      component.applyActionFilter();
    });

    it('keeps the same array between reads, so a sort is not undone', () => {
      expect(component.reviewRows).toBe(component.reviewRows);
      expect(component.reviewRows.map(row => row.index)).toEqual([2, 3]);
    });

    it('survives being reordered in place, the way the table sorts it', () => {
      component.reviewRows.reverse();

      expect(component.reviewRows.map(row => row.index)).toEqual([3, 2]);
    });

    it('narrows to one action when the filter changes, and comes back', () => {
      component.actionFilter = 'invalid';
      component.applyActionFilter();
      expect(component.reviewRows.map(row => row.index)).toEqual([3]);

      component.actionFilter = 'all';
      component.applyActionFilter();
      expect(component.reviewRows.map(row => row.index)).toEqual([2, 3]);
    });

    it('empties the list when the wizard starts over', () => {
      component.startOver();

      expect(component.reviewRows).toEqual([]);
    });
  });
});

import { applyAiMatches, buildImportRows, ColumnMapping, confidenceLabel, exactMapping, headerKey, pickField } from './column-mapping';
import { IMPORT_FIELD_NAMES, IMPORT_FIELDS } from './import-fields';

describe('Global Concepts import — column mapping', () => {
  it('mirrors the 23 fields of the back, in order', () => {
    expect(IMPORT_FIELDS).toHaveLength(23);
    expect(IMPORT_FIELD_NAMES[0]).toBe('term_id');
    expect(IMPORT_FIELD_NAMES[22]).toBe('notes');
    expect(new Set(IMPORT_FIELD_NAMES).size).toBe(23);
  });

  it('normalises headers like the back: case, spaces and punctuation do not count', () => {
    expect(headerKey('TERM ID')).toBe(headerKey('term_id'));
    expect(headerKey(' Preferred-Label ')).toBe('preferredlabel');
  });

  describe('exact match', () => {
    it('maps a header that names a field, and leaves the rest ignored', () => {
      const mappings = exactMapping(['TERM ID', 'Preferred label', 'TERM', 'Definition']);

      expect(mappings.map(m => m.field)).toEqual(['term_id', 'preferred_label', null, 'definition']);
      expect(mappings[0]).toEqual({ column: 0, header: 'TERM ID', field: 'term_id', source: 'exact', confidence: 1 });
      expect(mappings[2].source).toBe('none');
    });

    it('never maps two columns to one field: the first header keeps it', () => {
      const mappings = exactMapping(['definition', 'Definition']);

      expect(mappings.map(m => m.field)).toEqual(['definition', null]);
    });
  });

  describe('manual pick', () => {
    const start = (): ColumnMapping[] => exactMapping(['TERM ID', 'Name', 'Definition', 'Other text']);

    it('sets the field by hand, without a confidence badge', () => {
      const { mappings, clearedFrom } = pickField(start(), 1, 'preferred_label');

      expect(mappings[1]).toEqual(expect.objectContaining({ field: 'preferred_label', source: 'manual', confidence: null }));
      expect(clearedFrom).toBeNull();
      expect(confidenceLabel(mappings[1])).toBeNull();
    });

    it('takes the field away from the column that held it, and names that column', () => {
      const { mappings, clearedFrom } = pickField(start(), 3, 'definition');

      expect(mappings[3].field).toBe('definition');
      expect(mappings[2]).toEqual(expect.objectContaining({ field: null, source: 'none' }));
      expect(clearedFrom).toBe('Definition');
      expect(mappings.filter(m => m.field === 'definition')).toHaveLength(1);
    });

    it('"Ignore" (null) clears only its own column', () => {
      const { mappings, clearedFrom } = pickField(start(), 0, null);

      expect(mappings[0]).toEqual(expect.objectContaining({ field: null, source: 'manual' }));
      expect(mappings[2].field).toBe('definition');
      expect(clearedFrom).toBeNull();
    });
  });

  describe('AI matches', () => {
    it('fills the unmapped columns with the model confidence', () => {
      const { mappings, filled } = applyAiMatches(exactMapping(['TERM ID', 'TERM', 'Parent term']), [
        { column: 0, header: 'TERM ID', field: 'term_id', confidence: 1, source: 'exact' },
        { column: 1, header: 'TERM', field: 'preferred_label', confidence: 0.87, source: 'ai' },
        { column: 2, header: 'Parent term', field: 'phase_primary', confidence: 0.6, source: 'ai' }
      ]);

      expect(filled).toBe(2);
      expect(mappings[1]).toEqual(expect.objectContaining({ field: 'preferred_label', source: 'ai', confidence: 0.87 }));
      expect(confidenceLabel(mappings[1])).toBe('AI 0.87');
      expect(confidenceLabel(mappings[0])).toBe('exact');
    });

    it('never overrides a choice made by hand, nor an exact match', () => {
      const manual = pickField(exactMapping(['definition', 'TERM']), 1, 'scope_note').mappings;

      const { mappings, filled } = applyAiMatches(manual, [
        { column: 0, header: 'definition', field: 'short_definition', confidence: 0.9, source: 'ai' },
        { column: 1, header: 'TERM', field: 'preferred_label', confidence: 0.9, source: 'ai' }
      ]);

      expect(filled).toBe(0);
      expect(mappings.map(m => m.field)).toEqual(['definition', 'scope_note']);
    });

    it('does not hand out a field another column already holds, nor one the back does not know', () => {
      const { mappings, filled } = applyAiMatches(exactMapping(['definition', 'Meaning', 'Weird']), [
        { column: 1, header: 'Meaning', field: 'definition', confidence: 0.8, source: 'ai' },
        { column: 2, header: 'Weird', field: 'not_a_field', confidence: 0.8, source: 'ai' }
      ]);

      expect(filled).toBe(0);
      expect(mappings.map(m => m.field)).toEqual(['definition', null, null]);
    });

    it('lets the person edit an AI suggestion afterwards', () => {
      const ai = applyAiMatches(exactMapping(['TERM']), [
        { column: 0, header: 'TERM', field: 'preferred_label', confidence: 0.7, source: 'ai' }
      ]).mappings;
      const { mappings } = pickField(ai, 0, 'definition');

      expect(mappings[0]).toEqual(expect.objectContaining({ field: 'definition', source: 'manual' }));
    });
  });

  describe('row building', () => {
    const mappings = exactMapping(['TERM ID', 'preferred_label', 'Unused', 'definition']);

    it('keys each row by field, numbered by spreadsheet line, skipping empty cells', () => {
      const rows = buildImportRows(
        [
          ['12', 'Outcome', 'x', 'A change'],
          ['', ' Output ', 'y', '']
        ],
        mappings,
        true
      );

      expect(rows).toEqual([
        { term_id: '12', preferred_label: 'Outcome', definition: 'A change', __row: 2 },
        { preferred_label: 'Output', __row: 3 }
      ]);
    });

    it('drops rows that are empty in every mapped column, and counts from line 1 without a header', () => {
      const rows = buildImportRows(
        [
          ['', '', 'only ignored', ''],
          ['5', 'Impact', '', '']
        ],
        mappings,
        false
      );

      expect(rows).toEqual([{ term_id: '5', preferred_label: 'Impact', __row: 2 }]);
    });
  });
  it('numbers rows by their line in the file when blank lines were skipped', () => {
    const rows = buildImportRows(
      [['Outcome'], ['Output']],
      [{ column: 0, header: 'TERM', field: 'preferred_label', confidence: 1, source: 'exact' } as ColumnMapping],
      true,
      [2, 5]
    );
    expect(rows.map(r => r['__row'])).toEqual([2, 5]);
  });
});

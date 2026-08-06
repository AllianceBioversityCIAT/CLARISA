import { GlossaryFileParserService } from './glossary-file-parser.service';

describe('GlossaryFileParserService', () => {
  let service: GlossaryFileParserService;

  beforeEach(() => {
    service = new GlossaryFileParserService();
  });

  describe('parseText', () => {
    it('reads a comma separated file with a header row', () => {
      const table = service.parseText('term,definition\nOutcome,A change in behaviour\nOutput,A tangible product');

      expect(table.headers).toEqual(['term', 'definition']);
      expect(table.rows).toEqual([
        ['Outcome', 'A change in behaviour'],
        ['Output', 'A tangible product']
      ]);
    });

    it('reads content pasted from a spreadsheet (tab separated)', () => {
      const table = service.parseText('Term\tDefinition\nImpact Area\tOne of the five CGIAR areas');

      expect(table.headers).toEqual(['Term', 'Definition']);
      expect(table.rows).toEqual([['Impact Area', 'One of the five CGIAR areas']]);
    });

    it('reads semicolon separated content', () => {
      const table = service.parseText('term;definition\nOutcome;A change');

      expect(table.headers).toEqual(['term', 'definition']);
      expect(table.rows).toEqual([['Outcome', 'A change']]);
    });

    it('keeps commas that live inside quoted definitions', () => {
      const table = service.parseText('term,definition\nOutcome,"A change in behaviour, practice or policy"');

      expect(table.rows[0]).toEqual(['Outcome', 'A change in behaviour, practice or policy']);
    });

    it('honours escaped quotes inside a quoted field', () => {
      const table = service.parseText('term,definition\nOutcome,"A so-called ""change"" in behaviour"');

      expect(table.rows[0][1]).toBe('A so-called "change" in behaviour');
    });

    it('honours newlines inside a quoted definition without splitting the row', () => {
      const table = service.parseText('term,definition\nOutcome,"First line\nSecond line"');

      expect(table.rows).toHaveLength(1);
      expect(table.rows[0][1]).toBe('First line\nSecond line');
    });

    it('handles CRLF line endings without producing empty rows', () => {
      const table = service.parseText('term,definition\r\nOutcome,A change\r\nOutput,A product\r\n');

      expect(table.rows).toEqual([
        ['Outcome', 'A change'],
        ['Output', 'A product']
      ]);
    });

    it('handles lone CR line endings', () => {
      const table = service.parseText('term,definition\rOutcome,A change');

      expect(table.headers).toEqual(['term', 'definition']);
      expect(table.rows).toEqual([['Outcome', 'A change']]);
    });

    it('drops the trailing empty row when the text ends with a newline', () => {
      const table = service.parseText('term,definition\nOutcome,A change\n');

      expect(table.rows).toHaveLength(1);
    });

    it('strips the BOM that Excel writes at the start of a CSV', () => {
      const table = service.parseText('﻿term,definition\nOutcome,A change');

      expect(table.headers[0]).toBe('term');
    });

    it('keeps the first row as data when it is clearly not a header', () => {
      const table = service.parseText('Impact Area,One of the five CGIAR areas where impact is pursued. It is long.\nOutcome,A change');

      expect(table.headers).toEqual(['Column 1', 'Column 2']);
      expect(table.rows).toHaveLength(2);
      expect(table.rows[0][0]).toBe('Impact Area');
    });

    it('does not lose the first term when its definition is short and ends with a period', () => {
      // Regression: a 29-char definition with no inner ". " used to pass as a
      // header row, silently dropping the term.
      const table = service.parseText('Impact Area,One of the five CGIAR areas.\nOutcome,A change');

      expect(table.headers).toEqual(['Column 1', 'Column 2']);
      expect(table.rows).toHaveLength(2);
      expect(table.rows[0]).toEqual(['Impact Area', 'One of the five CGIAR areas.']);
    });

    it('does not lose the first term when its definition ends with other sentence punctuation', () => {
      const table = service.parseText('Outcome,What actually changed?\nOutput,A product');

      expect(table.rows).toHaveLength(2);
      expect(table.rows[0][0]).toBe('Outcome');
    });

    it('still recognises a header row even when a column title is long-ish', () => {
      const table = service.parseText('Glossary term,definition\nOutcome,A change');

      expect(table.headers).toEqual(['Glossary term', 'definition']);
      expect(table.rows).toHaveLength(1);
    });

    it('recognises Spanish header words', () => {
      const table = service.parseText('Concepto,Descripción\nResultado,Un cambio.');

      expect(table.headers).toEqual(['Concepto', 'Descripción']);
      expect(table.rows).toEqual([['Resultado', 'Un cambio.']]);
    });

    it('pads short rows so every row matches the header width', () => {
      const table = service.parseText('term,definition,notes\nOutcome,A change');

      expect(table.rows[0]).toEqual(['Outcome', 'A change', '']);
    });

    it('rejects empty content', () => {
      expect(() => service.parseText('   ')).toThrow(/empty/i);
    });

    it('rejects a file that only has a header row', () => {
      expect(() => service.parseText('term,definition')).toThrow(/only has a header/i);
    });

    it('rejects a file above the row limit', () => {
      const rows = Array.from({ length: 2001 }, (_, i) => `Term ${i},Definition ${i}`).join('\n');

      expect(() => service.parseText(`term,definition\n${rows}`)).toThrow(/limit is 2000/i);
    });
  });

  describe('detectColumns', () => {
    it('detects the usual English headers', () => {
      expect(service.detectColumns(['term', 'definition'])).toEqual({ termIndex: 0, definitionIndex: 1 });
    });

    it('detects headers regardless of case and order', () => {
      expect(service.detectColumns(['Definition', 'Term'])).toEqual({ termIndex: 1, definitionIndex: 0 });
    });

    it('detects Spanish headers', () => {
      expect(service.detectColumns(['Concepto', 'Descripción'])).toEqual({ termIndex: 0, definitionIndex: 1 });
    });

    it('detects headers that only contain the keyword', () => {
      expect(service.detectColumns(['Glossary term', 'Full definition'])).toEqual({ termIndex: 0, definitionIndex: 1 });
    });

    it('falls back to the first two columns when headers say nothing', () => {
      expect(service.detectColumns(['Column 1', 'Column 2'])).toEqual({ termIndex: 0, definitionIndex: 1 });
    });

    it('never maps term and definition to the same column', () => {
      const result = service.detectColumns(['name']);

      expect(result.termIndex).not.toBe(result.definitionIndex);
    });

    it('picks a different column for the term when only the definition matches', () => {
      const result = service.detectColumns(['definition', 'other']);

      expect(result.definitionIndex).toBe(0);
      expect(result.termIndex).toBe(1);
    });
  });

  describe('parseFile', () => {
    it('rejects an unsupported extension', async () => {
      const file = { name: 'terms.pdf' } as File;

      await expect(service.parseFile(file)).rejects.toThrow(/Unsupported file type/i);
    });

    it('reads a .csv file through the text parser', async () => {
      const file = {
        name: 'terms.csv',
        text: () => Promise.resolve('term,definition\nOutcome,A change')
      } as unknown as File;

      const table = await service.parseFile(file);

      expect(table.sourceName).toBe('terms.csv');
      expect(table.rows).toEqual([['Outcome', 'A change']]);
    });
  });
});

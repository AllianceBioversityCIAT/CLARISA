import { Injectable } from '@angular/core';

/** A table read from a file or from pasted text: a header row plus data rows. */
export interface ParsedTable {
  /** Column headers. When the source has none, synthetic `Column 1..N` are used. */
  headers: string[];
  /** Data rows, already aligned to `headers.length`. */
  rows: string[][];
  /** Where the data came from, shown back to the user. */
  sourceName: string;
}

const MAX_ROWS = 2000;

/**
 * Reads glossary data out of an Excel/CSV file or out of text pasted straight
 * from a spreadsheet. Everything is parsed in the browser and sent to the API
 * as plain JSON, so no multipart upload is involved.
 */
@Injectable()
export class GlossaryFileParserService {
  /** File extensions accepted by the upload input. */
  static readonly ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt', '.xlsx', '.xls'];

  /** Words that identify a row as column titles rather than data. */
  private static readonly HEADER_WORDS = new Set([
    'term',
    'terms',
    'concept',
    'concepts',
    'name',
    'title',
    'word',
    'acronym',
    'termino',
    'término',
    'terminos',
    'términos',
    'concepto',
    'conceptos',
    'nombre',
    'definition',
    'definitions',
    'description',
    'descriptions',
    'meaning',
    'definicion',
    'definición',
    'definiciones',
    'descripcion',
    'descripción',
    'detail',
    'details',
    'portfolio',
    'portfolios',
    'notes',
    'note'
  ]);

  async parseFile(file: File): Promise<ParsedTable> {
    const name = (file?.name ?? '').toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return this.parseExcel(file);
    }

    if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
      const text = await file.text();
      return this.parseText(text, file.name);
    }

    throw new Error(`Unsupported file type. Use one of: ${GlossaryFileParserService.ACCEPTED_EXTENSIONS.join(', ')}`);
  }

  /** Parses text pasted from Excel/Sheets (tab separated) or a CSV snippet. */
  parseText(text: string, sourceName = 'Pasted content'): ParsedTable {
    const clean = (text ?? '').replace(/^﻿/, '');

    if (!clean.trim()) {
      throw new Error('There is nothing to read: the content is empty');
    }

    const delimiter = this.detectDelimiter(clean);
    const matrix = this.splitDelimited(clean, delimiter);

    return this.toTable(matrix, sourceName);
  }

  private async parseExcel(file: File): Promise<ParsedTable> {
    // Loaded on demand so the admin bundle does not grow for everyone.
    const readXlsxFile = (await import('read-excel-file')).default;
    const content = (await readXlsxFile(file)) as unknown[][];

    const matrix = (content ?? []).map(row => (row ?? []).map(cell => this.cellToString(cell)));

    return this.toTable(matrix, file.name);
  }

  private cellToString(cell: unknown): string {
    if (cell === null || cell === undefined) {
      return '';
    }
    if (cell instanceof Date) {
      return cell.toISOString().slice(0, 10);
    }
    return String(cell);
  }

  /**
   * Picks the delimiter by counting candidates on the first non-empty line.
   * Tab wins when present, which is what a paste from Excel produces.
   */
  private detectDelimiter(text: string): string {
    const firstLine = text.split(/\r\n|\n|\r/).find(line => line.trim().length) ?? '';

    const counts = [
      { delimiter: '\t', count: (firstLine.match(/\t/g) ?? []).length },
      { delimiter: ';', count: (firstLine.match(/;/g) ?? []).length },
      { delimiter: ',', count: (firstLine.match(/,/g) ?? []).length },
      { delimiter: '|', count: (firstLine.match(/\|/g) ?? []).length }
    ];

    const best = counts.reduce((a, b) => (b.count > a.count ? b : a));

    return best.count > 0 ? best.delimiter : ',';
  }

  /**
   * Minimal RFC-4180 style reader: honours quoted fields, escaped quotes
   * (`""`) and newlines inside quotes, which glossary definitions do have.
   */
  private splitDelimited(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
        continue;
      }

      if (char === delimiter) {
        row.push(field);
        field = '';
        continue;
      }

      if (char === '\r') {
        // Swallow CR; the LF that follows closes the row.
        if (text[i + 1] === '\n') {
          continue;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        continue;
      }

      if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        continue;
      }

      field += char;
    }

    row.push(field);
    rows.push(row);

    return rows;
  }

  /**
   * Normalizes a raw matrix into a table: drops fully empty rows, takes the
   * first row as headers when it looks like one, and pads short rows.
   */
  private toTable(matrix: string[][], sourceName: string): ParsedTable {
    const nonEmpty = (matrix ?? []).filter(row => (row ?? []).some(cell => (cell ?? '').toString().trim().length));

    if (!nonEmpty.length) {
      throw new Error('No readable rows were found');
    }

    const width = nonEmpty.reduce((max, row) => Math.max(max, row.length), 0);
    const padded = nonEmpty.map(row => {
      const copy = [...row.map(cell => (cell ?? '').toString().trim())];
      while (copy.length < width) {
        copy.push('');
      }
      return copy;
    });

    const [first, ...rest] = padded;
    const looksLikeHeader = this.looksLikeHeader(first);

    const headers = looksLikeHeader ? first.map((cell, index) => cell || `Column ${index + 1}`) : first.map((_, index) => `Column ${index + 1}`);

    const rows = looksLikeHeader ? rest : padded;

    if (rows.length > MAX_ROWS) {
      throw new Error(`The file has ${rows.length} rows and the limit is ${MAX_ROWS}. Split it and load it in parts.`);
    }

    if (!rows.length) {
      throw new Error('The file only has a header row, there is no data to load');
    }

    return { headers, rows, sourceName };
  }

  /**
   * Decides whether the first row is a header or real data.
   *
   * Getting this wrong in the "header" direction silently DROPS a term, so the
   * rule is deliberately conservative:
   *
   * 1. A known header word (`term`, `definition`, `concepto`, …) settles it.
   * 2. Otherwise the row is only a header if no cell reads like a sentence —
   *    a short definition such as `"One of the five CGIAR areas."` ends with a
   *    period and must NOT be mistaken for a column title.
   *
   * When in doubt the row is kept as data: a stray `term | definition` row is
   * visible in the review step and easy to fix, a lost term is not.
   */
  private looksLikeHeader(row: string[]): boolean {
    const filled = row.filter(cell => cell.length);

    if (!filled.length) {
      return false;
    }

    if (filled.some(cell => GlossaryFileParserService.HEADER_WORDS.has(cell.toLowerCase().trim()))) {
      return true;
    }

    return filled.every(cell => cell.length <= 40 && !/[.!?;:]$/.test(cell) && !cell.includes('. '));
  }

  /**
   * Guesses which column holds the term and which one the definition, using
   * the usual header names. Returns -1 when nothing matches.
   */
  detectColumns(headers: string[]): { termIndex: number; definitionIndex: number } {
    const termNames = ['term', 'terms', 'concept', 'concepts', 'name', 'title', 'termino', 'término', 'concepto', 'nombre', 'acronym', 'word'];
    const definitionNames = [
      'definition',
      'definitions',
      'description',
      'meaning',
      'definicion',
      'definición',
      'descripcion',
      'descripción',
      'detail'
    ];

    const normalized = headers.map(header => header.toLowerCase().trim());

    const findBy = (candidates: string[]) => {
      const exact = normalized.findIndex(header => candidates.includes(header));
      if (exact !== -1) {
        return exact;
      }
      return normalized.findIndex(header => candidates.some(candidate => header.includes(candidate)));
    };

    let termIndex = findBy(termNames);
    let definitionIndex = findBy(definitionNames);

    // Fall back to the first two columns when the headers are unhelpful.
    if (termIndex === -1 && definitionIndex === -1 && headers.length >= 2) {
      termIndex = 0;
      definitionIndex = 1;
    } else if (termIndex === -1 && definitionIndex !== -1) {
      termIndex = definitionIndex === 0 ? 1 : 0;
    } else if (definitionIndex === -1 && termIndex !== -1 && headers.length >= 2) {
      definitionIndex = termIndex === 0 ? 1 : 0;
    }

    if (termIndex === definitionIndex) {
      definitionIndex = -1;
    }

    return { termIndex, definitionIndex };
  }
}

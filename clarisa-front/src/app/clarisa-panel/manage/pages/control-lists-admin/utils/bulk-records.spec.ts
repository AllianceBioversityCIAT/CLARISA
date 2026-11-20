import { FieldRow, ListRecord } from '../models/control-lists.models';
import { examplePaste, matchHeader, parseBulk, readCell, splitPaste } from './bulk-records';
import { BULK_MAX_TEXT_BYTES, MAX_BULK_RECORDS } from './limits';

const field = (code: string, type: string, over: Partial<FieldRow> = {}): FieldRow =>
  ({
    id: code.length,
    list_id: 7,
    code,
    label: code.charAt(0).toUpperCase() + code.slice(1),
    type,
    is_required: 0,
    is_unique: 0,
    is_indexed: 0,
    relation_list_id: null,
    position: 1,
    status: 'published',
    type_label: type,
    relation_name: null,
    relation_code: null,
    ...over
  }) as FieldRow;

const name = field('name', 'text', { is_required: 1, is_unique: 1 });
const kind = field('kind', 'relation', { label: 'Type', relation_name: 'Crop types', relation_code: 'crop_types' });
const area = field('area', 'decimal');

const cropTypes: ListRecord[] = [
  { id: 1, name: 'Cereal', is_active: true },
  { id: 2, name: 'Root', is_active: true },
  { id: 3, name: 'Legume', is_active: true },
  { id: 4, name: 'Tuber', is_active: false }
];
const related = { crop_types: cropTypes };

describe('splitPaste', () => {
  it('splits lines (LF and CRLF), drops blank ones, splits by TAB only and trims each cell', () => {
    expect(splitPaste('Maize\tCereal\r\n\r\n  \t \n Rice , white \tRoot\n')).toEqual([
      ['Maize', 'Cereal'],
      ['Rice , white', 'Root']
    ]);
  });

  it('drops empty cells at the end of a line but keeps empty cells before a value', () => {
    expect(splitPaste('Maize\tCereal\t\t\n\tRoot')).toEqual([
      ['Maize', 'Cereal'],
      ['', 'Root']
    ]);
  });
});

describe('splitPaste: cells a spreadsheet quoted', () => {
  it('keeps a quoted multi-line cell as one cell of one record, with its line break', () => {
    expect(splitPaste('Maize\t"Grown in\nAfrica and Asia"\nRice\tAsia')).toEqual([
      ['Maize', 'Grown in\nAfrica and Asia'],
      ['Rice', 'Asia']
    ]);
  });

  it('reads a doubled quote as one quote', () => {
    expect(splitPaste('"He said ""hi"""\tx')).toEqual([['He said "hi"', 'x']]);
  });

  it('keeps a leading quote that never closes as text', () => {
    expect(splitPaste('"Maize\tCereal\n5" pipe')).toEqual([['"Maize', 'Cereal'], ['5" pipe']]);
  });

  it('keeps a tab inside quotes in its cell, and handles CRLF and blank lines around it', () => {
    expect(splitPaste('"a\tb"\tc\r\n\r\nd')).toEqual([['a\tb', 'c'], ['d']]);
  });
});

describe('matchHeader', () => {
  it('matches labels or codes by name, folded, in any order and any subset', () => {
    expect(matchHeader(['NAME', 'type', 'Area'], [name, kind, area])).toEqual({ columns: [0, 1, 2], leading: true });
    expect(matchHeader(['area', 'Name'], [name, kind, area])).toEqual({ columns: [2, 0], leading: false });
    expect(matchHeader(['Name'], [name, kind])).toEqual({ columns: [0], leading: true });
    expect(matchHeader(['REGIÓN'], [field('region', 'text', { label: 'Region' })])).not.toBeNull();
    expect(matchHeader(['region'], [field('area_name', 'text', { label: 'Región' })])).not.toBeNull();
  });

  it('is not a header when a cell names no field, a field twice, or nothing', () => {
    expect(matchHeader(['Name', 'Maize'], [name, kind])).toBeNull();
    expect(matchHeader(['Name', 'name'], [name, kind])).toBeNull();
    expect(matchHeader(['', ''], [name, kind])).toBeNull();
  });
});

describe('readCell', () => {
  it('Required on an empty required cell; an empty optional cell is left out', () => {
    expect(readCell(name, '').problem).toBe('Required');
    expect(readCell(area, '')).toEqual({ text: '', shown: '', value: null, problem: null });
  });

  it('refuses a decimal whose comma could separate thousands, and keeps the decimal comma', () => {
    expect(readCell(area, '12,000').problem).toBe(
      'Ambiguous number: write 12000 if the comma separates thousands, or 12.0 if it is the decimal point.'
    );
    expect(readCell(area, '1,234').problem).toBe(
      'Ambiguous number: write 1234 if the comma separates thousands, or 1.234 if it is the decimal point.'
    );
    expect(readCell(area, '1,234,567').problem).toContain('write 1234567 if');
    expect(readCell(area, '-1,000').problem).toBe(
      'Ambiguous number: write -1000 if the comma separates thousands, or -1.0 if it is the decimal point.'
    );
    expect(readCell(area, '2,9')).toMatchObject({ value: 2.9, shown: '2.9', problem: null });
    expect(readCell(area, '12,50')).toMatchObject({ value: 12.5, problem: null });
  });

  it('shows what will be saved: the option label, Yes / No, the number sent; the pasted text when there is a problem', () => {
    expect(readCell(kind, '3', related)).toMatchObject({ value: 3, shown: 'Legume' });
    expect(readCell(kind, 'cereal', related)).toMatchObject({ value: 1, shown: 'Cereal' });
    expect(readCell(field('staple', 'boolean'), 'true').shown).toBe('Yes');
    expect(readCell(field('staple', 'boolean'), '0').shown).toBe('No');
    expect(readCell(field('size', 'integer'), '007').shown).toBe('7');
    expect(readCell(name, 'Maize').shown).toBe('Maize');
    expect(readCell(kind, 'Cerial', related).shown).toBe('Cerial');
  });

  it('a long text over 65,535 bytes of UTF-8 is too long, whatever its number of characters', () => {
    const notes = field('notes', 'long_text');
    expect(readCell(notes, 'é'.repeat(32_768)).problem).toBe('Too long: this text needs 65,536 bytes of the 65,535 a long text holds.');
    expect(readCell(notes, 'a'.repeat(65_000)).problem).toBeNull();
  });

  it('numbers: whole numbers, decimals with a point or a comma, and why the rest fail', () => {
    const size = field('size', 'integer');
    expect(readCell(size, '12').value).toBe(12);
    expect(readCell(size, '-3').value).toBe(-3);
    expect(readCell(size, '3.5').problem).toBe('Expects a whole number');
    expect(readCell(size, '99999999999999999999').problem).toBe('That number is too large');
    expect(readCell(area, '3,75').value).toBe(3.75);
    expect(readCell(area, '0.5').value).toBe(0.5);
    expect(readCell(area, '1,234.5').problem).toBe('Expects a number, for example 12.5');
    expect(readCell(area, '12.34567').problem).toBe('Up to 14 digits before the point and 4 after it');
  });

  it('Yes / No accepts yes, no, true, false, 1 and 0 in any case', () => {
    const staple = field('staple', 'boolean');
    expect(['yes', 'TRUE', '1'].map(t => readCell(staple, t).value)).toEqual([true, true, true]);
    expect(['No', 'false', '0'].map(t => readCell(staple, t).value)).toEqual([false, false, false]);
    expect(readCell(staple, 'maybe').problem).toBe('Expects yes or no');
  });

  it('dates must exist and follow YYYY-MM-DD; date and time accepts a space or a T', () => {
    const sown = field('sown', 'date');
    const at = field('at', 'datetime');
    expect(readCell(sown, '2026-03-15').value).toBe('2026-03-15');
    expect(readCell(sown, '2026-02-30').problem).toBe('Expects a date as YYYY-MM-DD');
    expect(readCell(sown, '15/03/2026').problem).toBe('Expects a date as YYYY-MM-DD');
    expect(readCell(at, '2026-03-15 14:30').value).toBe('2026-03-15 14:30:00');
    expect(readCell(at, '2026-03-15T14:30:05').value).toBe('2026-03-15 14:30:05');
    expect(readCell(at, '2026-03-15').problem).toBe('Expects a date as YYYY-MM-DD HH:MM');
  });

  it('links, e-mails and the longest text each type holds', () => {
    const site = field('site', 'url');
    const mail = field('mail', 'email');
    expect(readCell(site, 'https://example.org/maize').value).toBe('https://example.org/maize');
    expect(readCell(site, 'example.org').problem).toBe('Expects a link starting with http:// or https://');
    expect(readCell(mail, 'maize@example.org').value).toBe('maize@example.org');
    expect(readCell(mail, 'maize@example').problem).toBe('Expects a valid e-mail');
    expect(readCell(name, 'x'.repeat(256)).problem).toBe('Admits 255 characters at most (it has 256)');
    expect(readCell(name, 'x'.repeat(255)).problem).toBeNull();
    expect(readCell(site, 'https://example.org/' + 'x'.repeat(481)).problem).toBe('Admits 500 characters at most (it has 501)');
  });

  it('a relation takes the label of an active option (no case, no accents) or its id', () => {
    expect(readCell(kind, 'cereal', related).value).toBe(1);
    expect(readCell(kind, 'LÉGUME', related).value).toBe(3);
    expect(readCell(kind, '2', related).value).toBe(2);
    expect(readCell(kind, 'Cerial', related).problem).toBe('No option “Cerial” in Crop types');
    // An inactive option cannot be chosen, by label or by id.
    expect(readCell(kind, 'Tuber', related).problem).toBe('No option “Tuber” in Crop types');
    expect(readCell(kind, '4', related).problem).toBe('No option “4” in Crop types');
  });

  it('the visible label wins over an id: options called «1», «2», «3»', () => {
    const numbered = {
      crop_types: [
        { id: 1, name: '3', is_active: true },
        { id: 2, name: '1', is_active: true },
        { id: 3, name: '2', is_active: true },
        { id: 7, name: 'Cereal', is_active: true }
      ]
    };
    // «1» is the label of record 2, not the record whose id is 1.
    expect(readCell(kind, '1', numbered).value).toBe(2);
    expect(readCell(kind, '3', numbered).value).toBe(1);
    // A whole number that names no option is the id of an active option.
    expect(readCell(kind, '7', numbered).value).toBe(7);
    expect(readCell(kind, '8', numbered).problem).toBe('No option “8” in Crop types');
    const twice = { crop_types: [...numbered.crop_types, { id: 9, name: '1', is_active: true }] };
    expect(readCell(kind, '1', twice).problem).toBe('More than one option is called “1”: write its id instead.');
  });

  it('a label shared by two options asks for the id', () => {
    const twice = { crop_types: [...cropTypes, { id: 9, name: 'cereal', is_active: true }] };
    expect(readCell(kind, 'Cereal', twice).problem).toBe('More than one option is called “Cereal”: write its id instead.');
    expect(readCell(kind, '9', twice).value).toBe(9);
  });

  it('when the options could not be loaded, an id goes as written and a label asks for the id', () => {
    const failed = { crop_types: null };
    expect(readCell(kind, '2', failed).value).toBe(2);
    expect(readCell(kind, 'Cereal', failed).problem).toBe('The options of Crop types could not be loaded: write the id instead.');
  });
});

describe('parseBulk', () => {
  const fields = [name, kind, area];

  it('reads rows copied from a spreadsheet into one record per row keyed by field code', () => {
    const p = parseBulk('Maize\tCereal\t3,5\r\nRice\tRoot\nCassava, bitter\t2\t\t', fields, related);
    expect(p.rows.length).toBe(3);
    expect(p.withProblems).toBe(0);
    expect(p.ready).toBe(3);
    expect(p.headerSkipped).toBe(false);
    expect(p.records).toEqual([
      { name: 'Maize', kind: 1, area: 3.5 },
      { name: 'Rice', kind: 2 },
      { name: 'Cassava, bitter', kind: 2 }
    ]);
  });

  it('leaves the header out and says so', () => {
    const p = parseBulk('Name\tType\tArea\nMaize\tCereal\t1', fields, related);
    expect(p.headerSkipped).toBe(true);
    expect(p.rows.map(r => r.n)).toEqual([1]);
    expect(p.records).toEqual([{ name: 'Maize', kind: 1, area: 1 }]);
  });

  it('a partial header fills only the fields it names; the others stay empty and say Required', () => {
    const p = parseBulk('Type\nCereal', [name, kind], related);
    expect(p.headerSkipped).toBe(true);
    expect(p.header).toBe('byName');
    expect(p.rows[0].cells[0].problem).toBe('Required');
    expect(p.rows[0].cells[1].value).toBe(1);
  });

  it('places reordered columns in the right fields, with the note about names', () => {
    const p = parseBulk('Area\tname\n3,5\tMaize', [name, kind, area], related);
    expect(p.header).toBe('byName');
    expect(p.records).toEqual([{ name: 'Maize', area: 3.5 }]);
  });

  it('a header that is the leading fields in order keeps the short note', () => {
    expect(parseBulk('Name\nMaize', [name, kind], related).header).toBe('leading');
  });

  it('the person decides: forced off the line is a record; forced on with other names it is left out, columns by position', () => {
    const off = parseBulk('Name\nMaize', [name], related, [], false);
    expect(off.headerDetected).toBe(true);
    expect(off.headerSkipped).toBe(false);
    expect(off.records).toEqual([{ name: 'Name' }, { name: 'Maize' }]);

    const on = parseBulk('Crop\tKind\nMaize\tCereal', [name, kind], related, [], true);
    expect(on.headerDetected).toBe(false);
    expect(on.headerSkipped).toBe(true);
    expect(on.header).toBe('leading');
    expect(on.records).toEqual([{ name: 'Maize', kind: 1 }]);
  });

  it('one field: a first record that is literally the label reads as a header until the person says it is not', () => {
    expect(parseBulk('name\nMaize', [name]).rows.length).toBe(1);
    expect(parseBulk('name\nMaize', [name], {}, [], false).rows.length).toBe(2);
  });

  it('is too much text for one request past 2 MB in all', () => {
    const notes = field('notes', 'long_text');
    const lines = (n: number) => Array.from({ length: n }, () => 'x'.repeat(60_000)).join('\n');
    expect(33 * 60_000).toBeLessThan(BULK_MAX_TEXT_BYTES);
    expect(parseBulk(lines(33), [notes]).tooMuchText).toBe(false);
    expect(parseBulk(lines(34), [notes]).tooMuchText).toBe(true);
  });

  it('marks a row with more columns than fields', () => {
    const p = parseBulk('Maize\tCereal\t1\textra', fields, related);
    expect(p.rows[0].problem).toBe('This row has 4 columns; the list has 3 fields.');
    expect(p.withProblems).toBe(1);
    expect(p.records).toEqual([]);
  });

  it('points a repeated value of a unique field at the row that has it first, ignoring case', () => {
    const p = parseBulk('Maize\nRice\nmaize\nBeans\nRice', [name], related);
    expect(p.rows.map(r => r.cells[0].problem)).toEqual([null, null, 'Repeated in row 1', null, 'Repeated in row 2']);
    expect(p.ready).toBe(3);
    expect(p.withProblems).toBe(2);
  });

  it('a value of a unique field already in the list (case, accents and inactive records too) cannot be pasted again', () => {
    const existing = [
      { id: 1, name: 'Maize', is_active: true },
      { id: 2, name: 'Café', is_active: false }
    ];
    const p = parseBulk('MAIZE\ncafe\nRice\nrice', [name], related, existing);
    expect(p.rows.map(r => r.cells[0].problem)).toEqual(['Already in the list', 'Already in the list', null, 'Repeated in row 3']);
    expect(p.ready).toBe(1);
  });

  it('never says «Already in the list» for a field that admits repeats', () => {
    const p = parseBulk('Cereal\nRoot', [kind], related, [{ id: 1, kind: 1, is_active: true }]);
    expect(p.withProblems).toBe(0);
  });

  it('does not look for repeats in a field that admits them', () => {
    const p = parseBulk('Cereal\nCereal', [kind], related);
    expect(p.withProblems).toBe(0);
  });

  it('counts the required cells that are empty', () => {
    const p = parseBulk('\tCereal\nMaize\tCerial', fields, related);
    expect(p.rows[0].cells[0].problem).toBe('Required');
    expect(p.rows[1].cells[1].problem).toBe('No option “Cerial” in Crop types');
    expect(p.withProblems).toBe(2);
    expect(p.ready).toBe(0);
  });

  it('is over the limit past 500 rows, and not at 500', () => {
    const lines = (n: number) => Array.from({ length: n }, (_, i) => `Crop ${i + 1}`).join('\n');
    expect(parseBulk(lines(MAX_BULK_RECORDS), [name]).overLimit).toBe(false);
    const over = parseBulk(lines(612), [name]);
    expect(over.overLimit).toBe(true);
    expect(over.rows.length).toBe(612);
  });

  it('an empty paste has no rows', () => {
    expect(parseBulk('  \n\t\n', fields, related)).toMatchObject({ rows: [], ready: 0, withProblems: 0, records: [] });
  });
});

describe('examplePaste from the records already in the list', () => {
  it('uses the first three active records, with option labels, Yes / No, numbers and dates as a person pastes them', () => {
    const staple = field('staple', 'boolean', { is_required: 1 });
    const sown = field('sown', 'datetime');
    const fields = [name, kind, staple, sown, area];
    const existing = [
      { id: 1, name: 'Old', kind: 1, staple: true, sown: null, is_active: false },
      { id: 2, name: 'Maize', kind: 1, staple: 1, sown: '2026-03-15 14:30:00', is_active: true },
      { id: 3, name: 'Cassava', kind: 3, staple: 0, sown: null, is_active: true },
      { id: 4, name: 'Rice', kind: 99, staple: false, sown: null, is_active: 1 },
      { id: 5, name: 'Beans', kind: 3, staple: true, sown: null, is_active: true }
    ];
    // Up to the last required field (staple, the 3rd), so area (5th) is left out.
    expect(examplePaste(fields, related, existing)).toBe(['Maize\tCereal\tYes', 'Cassava\tLegume\tNo', 'Rice\t99\tNo'].join('\n'));
  });

  it('with no active record keeps the made-up example', () => {
    expect(examplePaste([name], related, [{ id: 1, name: 'Old', is_active: false }])).toBe('Maize\nRice\nCassava');
  });
});

describe('examplePaste', () => {
  it('three lines for the first field: crops for a text, real option names for a relation', () => {
    expect(examplePaste([name])).toBe('Maize\nRice\nCassava');
    expect(examplePaste([kind], related)).toBe('Cereal\nRoot\nLegume');
    expect(examplePaste([field('sown', 'date')])).toBe('2026-03-15\n2026-04-01\n2026-05-20');
    expect(examplePaste([])).toBe('');
  });

  it('shows one column for every field up to the last required one, so two required values are not suggested as one', () => {
    const required = (f: FieldRow): FieldRow => ({ ...f, is_required: 1 });
    // Name and Kind are required: both columns, tab between them, real option names.
    expect(examplePaste([required(name), required(kind), area], related)).toBe('Maize\tCereal\nRice\tRoot\nCassava\tLegume');
    // Only the first is required: one value per line is enough, and that is what it shows.
    expect(examplePaste([required(name), kind, area], related)).toBe('Maize\nRice\nCassava');
    // The last required field is the third: the optional one in between has its column too.
    expect(
      examplePaste([name, kind, required(area)], related)
        .split('\n')[0]
        .split('\t')
    ).toHaveLength(3);
    // Fewer options than rows: they repeat instead of leaving a cell empty.
    const two = { [String(kind.relation_code)]: (related[String(kind.relation_code)] ?? []).slice(0, 2) };
    expect(examplePaste([required(name), required(kind)], two).split('\n')[2]).toBe('Cassava\t' + examplePaste([kind], two).split('\n')[0]);
    // Never more than four columns.
    const many = Array.from({ length: 6 }, (_, i) => required(field('f' + i, 'text')));
    expect(examplePaste(many).split('\n')[0].split('\t')).toHaveLength(4);
  });
});

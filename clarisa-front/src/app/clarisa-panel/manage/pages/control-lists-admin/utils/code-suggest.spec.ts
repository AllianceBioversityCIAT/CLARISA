import { codeProblem, isUsableCode, isValidCode, suggestCode } from './code-suggest';

describe('suggestCode', () => {
  it('lowercases and turns every run of non-alphanumerics into one underscore', () => {
    expect(suggestCode('Crop Varieties')).toBe('crop_varieties');
    expect(suggestCode('  Crops -- & Seeds!  ')).toBe('crops_seeds');
  });

  it('drops accents instead of cutting the word', () => {
    expect(suggestCode('Países y Regiones')).toBe('paises_y_regiones');
  });

  it('starts at the first letter so the result can be valid', () => {
    expect(suggestCode('2024 Crops')).toBe('crops');
    expect(suggestCode('___x')).toBe('x');
    expect(suggestCode('123')).toBe('');
    expect(suggestCode('')).toBe('');
  });

  it('keeps at most 50 characters and never ends with an underscore', () => {
    const code = suggestCode('a'.repeat(49) + ' b');
    expect(code.length).toBeLessThanOrEqual(50);
    expect(code.endsWith('_')).toBe(false);
    expect(isValidCode(code)).toBe(true);
  });
});

describe('isValidCode', () => {
  it('accepts the shape the back accepts', () => {
    expect(isValidCode('crops')).toBe(true);
    expect(isValidCode('a')).toBe(true);
    expect(isValidCode('crop_2')).toBe(true);
    expect(isValidCode('a' + 'b'.repeat(49))).toBe(true);
  });

  it('rejects the rest', () => {
    expect(isValidCode('')).toBe(false);
    expect(isValidCode('Crops')).toBe(false);
    expect(isValidCode('1crops')).toBe(false);
    expect(isValidCode('_crops')).toBe(false);
    expect(isValidCode('crop-s')).toBe(false);
    expect(isValidCode('a' + 'b'.repeat(50))).toBe(false);
  });
});

describe('suggestCode avoids what the back reserves', () => {
  it('adds _field to a field code the back keeps, and _list to a list code', () => {
    expect(suggestCode('Date', 'field')).toBe('date_field');
    expect(suggestCode('Id', 'field')).toBe('id_field');
    expect(suggestCode('Admin', 'list')).toBe('admin_list');
    expect(suggestCode('Select', 'list')).toBe('select_list');
  });

  it('keeps the plain suggestion when it is free, and when no kind is given', () => {
    expect(suggestCode('Crop type', 'field')).toBe('crop_type');
    expect(suggestCode('Date')).toBe('date');
    // `admin` is only reserved as a list code, `id` only as a field code.
    expect(suggestCode('Admin', 'field')).toBe('admin');
    expect(suggestCode('Id', 'list')).toBe('id');
  });

  it('never leaves the 50 characters of a code and the result is usable', () => {
    const code = suggestCode('Date', 'field');
    expect(isUsableCode(code, 'field')).toBe(true);
    expect(suggestCode('', 'field')).toBe('');
  });
});

describe('codeProblem', () => {
  it('is empty for an empty code, a good one, and the shape message otherwise', () => {
    expect(codeProblem('', 'field')).toBe('');
    expect(codeProblem('crop_type', 'field')).toBe('');
    expect(codeProblem('Crop-Type', 'field')).toContain('lowercase letters');
  });

  it('says a reserved code is a reserved word, in the words of the screen', () => {
    expect(codeProblem('select', 'field')).toBe('"select" is a reserved word. Choose another code.');
    expect(codeProblem('created_at', 'field')).toBe('"created_at" is a reserved word. Choose another code.');
    expect(codeProblem('admin', 'list')).toBe('"admin" is a reserved word. Choose another code.');
    expect(codeProblem('schema_ops', 'list')).toBe('"schema_ops" is a reserved word. Choose another code.');
  });

  it('reserves each kind its own: system columns are field codes only, routes list codes only', () => {
    expect(isUsableCode('id', 'field')).toBe(false);
    expect(isUsableCode('id', 'list')).toBe(true);
    expect(isUsableCode('admin', 'list')).toBe(false);
    expect(isUsableCode('admin', 'field')).toBe(true);
    expect(isUsableCode('version', 'list')).toBe(false);
    expect(isUsableCode('version', 'field')).toBe(false);
  });
});

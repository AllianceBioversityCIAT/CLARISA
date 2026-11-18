import { isValidCode, suggestCode } from './code-suggest';

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

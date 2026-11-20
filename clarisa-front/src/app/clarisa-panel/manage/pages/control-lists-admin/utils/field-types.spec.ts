import { foldText, freeCode, MAX_INLINE_OPTIONS, optionsProblem, parseOptions, typeChoices, typeName } from './field-types';

describe('field types on screen', () => {
  const offered = [
    { value: 'relation', label: 'Relation to another list' },
    { value: 'text', label: 'Short text' },
    { value: 'geo', label: 'Coordinates' },
    { value: 'date', label: 'Date' }
  ];

  it('orders what the back offers, with the words of the screen, and keeps a type it does not know', () => {
    const choices = typeChoices(offered);
    expect(choices.map(c => c.value)).toEqual(['text', 'relation', 'date', 'geo']);
    expect(choices.find(c => c.value === 'relation')?.label).toBe('Options');
    expect(choices.find(c => c.value === 'geo')).toMatchObject({ label: 'Coordinates', example: '' });
  });

  it('never offers a type the back did not send', () => {
    expect(typeChoices([]).length).toBe(0);
    expect(typeChoices([{ value: 'text', label: 'Short text' }]).map(c => c.value)).toEqual(['text']);
  });

  it('names a type, falling back to the back label and then to the value', () => {
    expect(typeName('relation', 'Relation to another list')).toBe('Options');
    expect(typeName('geo', 'Coordinates')).toBe('Coordinates');
    expect(typeName('geo', null)).toBe('geo');
  });
});

describe('options written in the field', () => {
  it('reads one option per line, trimmed, without blank lines', () => {
    expect(parseOptions(' Cereal \r\n\n  Root\nLegume\n   ')).toEqual(['Cereal', 'Root', 'Legume']);
    expect(parseOptions('')).toEqual([]);
  });

  it('finds a repeat even when only case or accents differ', () => {
    expect(optionsProblem(['Cereal', 'Root'])).toBe('');
    expect(optionsProblem(['Café', 'cafe'])).toBe('"cafe" is repeated.');
    expect(optionsProblem([])).toBe('');
  });

  it('caps how many options a field can start with, and how long one is', () => {
    const many = Array.from({ length: MAX_INLINE_OPTIONS + 1 }, (_, i) => `Option ${i}`);
    expect(optionsProblem(many)).toContain('100 options at most');
    expect(optionsProblem(many.slice(0, MAX_INLINE_OPTIONS))).toBe('');
    expect(optionsProblem(['x'.repeat(256)])).toContain('longer than 255 characters');
  });

  it('proposes a list code nobody uses, inside the 50 characters of a code', () => {
    expect(freeCode('crops_type', [])).toBe('crops_type');
    expect(freeCode('crops_type', ['crops_type', 'crops_type_2'])).toBe('crops_type_3');
    const long = 'a'.repeat(50);
    const next = freeCode(long, [long]);
    expect(next).toHaveLength(50);
    expect(next.endsWith('_2')).toBe(true);
    expect(freeCode('', ['x'])).toBe('');
  });
});

describe('foldText', () => {
  it('drops case and accents, the way the options lists and unique indexes compare', () => {
    expect(foldText('Légume')).toBe('legume');
    expect(foldText('CAFÉ')).toBe(foldText('cafe'));
    expect(foldText('Ñame')).toBe('name');
  });
});

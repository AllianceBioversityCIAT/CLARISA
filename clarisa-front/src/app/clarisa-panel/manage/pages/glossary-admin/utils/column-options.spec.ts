import { buildColumnOptions, MAX_GENERATED_COLUMN_OPTIONS } from './column-options';

/** Builds a header list where `generated` marks the invented ones. */
const table = (headers: string[], generated: boolean[]) => ({ headers, generatedHeaders: generated });

describe('buildColumnOptions', () => {
  it('lists every column when the file is small', () => {
    const { options, hiddenCount } = buildColumnOptions(table(['term', 'definition'], [false, false]));

    expect(options).toEqual([
      { label: 'term', value: 0 },
      { label: 'definition', value: 1 }
    ]);
    expect(hiddenCount).toBe(0);
  });

  it('caps the invented headers and reports how many were left out', () => {
    const headers = ['term', 'definition', ...Array.from({ length: 30 }, (_, i) => `Column ${i + 3}`)];
    const generated = headers.map((_, index) => index >= 2);

    const { options, hiddenCount } = buildColumnOptions(table(headers, generated));

    expect(options).toHaveLength(2 + MAX_GENERATED_COLUMN_OPTIONS);
    expect(hiddenCount).toBe(10);
    expect(options[options.length - 1]).toEqual({ label: 'Column 22', value: 21 });
  });

  it('never hides a named column, however many there are', () => {
    const headers = Array.from({ length: 40 }, (_, i) => `Header ${i + 1}`);

    const { options, hiddenCount } = buildColumnOptions(
      table(
        headers,
        headers.map(() => false)
      )
    );

    expect(options).toHaveLength(40);
    expect(hiddenCount).toBe(0);
  });

  it('keeps the auto-detected columns visible even past the cap', () => {
    const headers = Array.from({ length: 40 }, (_, i) => `Column ${i + 1}`);
    const generated = headers.map(() => true);

    const { options } = buildColumnOptions(table(headers, generated), [35, null]);

    expect(options.map(option => option.value)).toContain(35);
    expect(options).toHaveLength(MAX_GENERATED_COLUMN_OPTIONS + 1);
  });

  it('keeps the option value aligned with the real column index', () => {
    const headers = ['term', 'Column 2', 'definition'];

    const { options } = buildColumnOptions(table(headers, [false, true, false]));

    expect(options[2]).toEqual({ label: 'definition', value: 2 });
  });
});

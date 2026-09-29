import { BadRequestException } from '@nestjs/common';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcField, GcFieldType } from '../entities/gc-field.entity';
import { ExtraContext, mergeExtra, termLinkIds } from './custom-fields';

const field = (code: string, type: GcFieldType, more: Partial<GcField> = {}) =>
  Object.assign(new GcField(), {
    id: 1,
    scheme_id: 1,
    code,
    label: code.toUpperCase(),
    type,
    list_code: null,
    required: false,
    is_public: true,
    sort: 0,
    is_active: true,
    help: null,
    ...more,
  });

describe('custom fields — mergeExtra', () => {
  let ctx: ExtraContext;

  beforeEach(() => {
    ctx = {
      fields: [
        field('owner', GcFieldType.TEXT),
        field('long', GcFieldType.LONG_TEXT),
        field('tags', GcFieldType.MULTI_TEXT),
        field('region', GcFieldType.LIST, { list_code: 'region' }),
        field('regions', GcFieldType.MULTI_LIST, { list_code: 'region' }),
        field('see', GcFieldType.TERM_LINK),
        field('doc', GcFieldType.URL),
        field('since', GcFieldType.DATE),
        field('weight', GcFieldType.NUMBER),
      ],
      lists: new Map([
        [
          'region',
          new Map([
            ['africa', 'africa'],
            ['sub-saharan africa', 'africa'],
            ['asia', 'asia'],
          ]),
        ],
      ]),
      concepts: new Map([
        [10, { term_id: 10 } as GcConcept],
        [11, { term_id: 11 } as GcConcept],
      ]),
    };
  });

  const bad = (incoming: Record<string, unknown>, re?: RegExp) => {
    const run = () => mergeExtra(ctx, {}, incoming, false);
    expect(run).toThrow(BadRequestException);
    if (re) expect(run).toThrow(re);
  };

  it.each([
    [{ owner: '  PPT   team ' }, { owner: 'PPT team' }],
    [{ long: ' line 1\nline 2 ' }, { long: 'line 1\nline 2' }],
    [{ tags: ['a', ' a ', 'b', ''] }, { tags: ['a', 'b'] }],
    [{ tags: 'single' }, { tags: ['single'] }],
    [{ region: 'Sub-Saharan Africa' }, { region: 'africa' }],
    [{ regions: ['Asia', 'africa', 'ASIA'] }, { regions: ['asia', 'africa'] }],
    [{ see: [10, '11', 10] }, { see: [10, 11] }],
    [{ doc: 'https://example.org/x' }, { doc: 'https://example.org/x' }],
    [{ since: '2026-02-28' }, { since: '2026-02-28' }],
    [{ weight: '2.5' }, { weight: 2.5 }],
    [{ weight: 0 }, { weight: 0 }],
  ])('accepts and normalises %j', (incoming, expected) => {
    expect(mergeExtra(ctx, {}, incoming, false)).toEqual(expected);
  });

  it.each([
    [{ owner: ['a', 'b'] }, /one text/],
    [{ owner: { a: 1 } }, /expects text/],
    [{ owner: 'x'.repeat(1001) }, /1000/],
    [{ region: 'Mars' }, /region list/],
    [{ regions: ['asia', 'mars'] }, /region list/],
    [{ see: [99] }, /no concept with term_id 99/],
    [{ see: ['abc'] }, /not a term_id/],
    [{ doc: 'ftp://example.org/x' }, /http\(s\)/],
    [{ doc: 'not a url' }, /http\(s\)/],
    [{ since: '2026-02-30' }, /YYYY-MM-DD/],
    [{ since: '28/02/2026' }, /YYYY-MM-DD/],
    [{ weight: 'heavy' }, /number/],
    [{ weight: true }, /number/],
  ])('rejects %j', (incoming, re) => bad(incoming, re));

  it('rejects an unknown key, an inactive field and a reserved key', () => {
    bad({ nope: 'x' }, /Unknown custom field/);
    // Only ACTIVE definitions accept values.
    ctx.fields = ctx.fields.filter((f) => f.code !== 'owner');
    bad({ owner: 'x' }, /Unknown custom field/);
    bad({ deprecation_reason: 'x' }, /Unknown custom field/);
    bad({ _internal: 'x' }, /Unknown custom field/);
  });

  it('merges: keys not sent are kept, reserved keys survive, empty values clear', () => {
    const current = {
      owner: 'PPT',
      doc: 'https://a.org',
      deprecation_reason: 'Split in two',
      _import_row: 4,
      retired_field: 'kept',
    };
    const out = mergeExtra(
      ctx,
      current,
      { owner: 'MEL CoP', doc: '', tags: [], weight: null },
      false,
    );
    expect(out).toEqual({
      owner: 'MEL CoP',
      deprecation_reason: 'Split in two',
      _import_row: 4,
      retired_field: 'kept',
    });
    // The stored object is never mutated in place.
    expect(current.owner).toBe('PPT');
  });

  it('keeps everything when nothing is sent (old concepts without extra keep working)', () => {
    expect(mergeExtra(ctx, undefined, undefined, false)).toEqual({});
    expect(mergeExtra(ctx, { owner: 'x' }, undefined, false)).toEqual({
      owner: 'x',
    });
  });

  it('enforces required on create, and on update only when the key is sent', () => {
    ctx.fields.push(
      field('steward_unit', GcFieldType.TEXT, { required: true }),
    );
    expect(() => mergeExtra(ctx, {}, undefined, true)).toThrow(
      /Required custom field\(s\) missing: steward_unit/,
    );
    expect(() => mergeExtra(ctx, {}, { steward_unit: ' ' }, true)).toThrow(
      /required/,
    );
    expect(mergeExtra(ctx, {}, { steward_unit: 'PPT' }, true)).toEqual({
      steward_unit: 'PPT',
    });
    // An existing concept without the value can still be edited elsewhere…
    expect(mergeExtra(ctx, {}, { owner: 'x' }, false)).toEqual({ owner: 'x' });
    // …but the required value cannot be cleared.
    expect(() =>
      mergeExtra(ctx, { steward_unit: 'PPT' }, { steward_unit: null }, false),
    ).toThrow(/cannot be emptied/);
  });

  it('refuses an extra that is not an object', () => {
    expect(() =>
      mergeExtra(ctx, {}, ['a'] as unknown as Record<string, unknown>, false),
    ).toThrow(/object/);
  });

  it('collects the term ids a payload links to, before checking them', () => {
    expect(
      termLinkIds(ctx.fields, { see: [10, '12', 'x'], owner: '5' }),
    ).toEqual([10, 12]);
    expect(termLinkIds(ctx.fields, undefined)).toEqual([]);
  });
});

import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import {
  GcLabel,
  GcLabelKind,
  GcLabelStatus,
} from '../entities/gc-label.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import { QualityCode, checkQuality } from './quality-gate';

const concept = (
  id: number,
  label: string,
  overrides: Partial<GcConcept> = {},
): GcConcept =>
  ({
    id,
    scheme_id: 1,
    term_id: 1000 + id,
    preferred_label: label,
    language: 'en',
    definition: `Definition of ${label}`,
    status: GcConceptStatus.APPROVED,
    replaced_by_id: null,
    ...overrides,
  }) as GcConcept;

const label = (
  conceptId: number,
  text: string,
  kind: GcLabelKind,
  language = 'en',
  status = GcLabelStatus.ACTIVE,
): GcLabel =>
  ({
    id: Math.random(),
    concept_id: conceptId,
    label: text,
    kind,
    language,
    status,
  }) as GcLabel;

let relId = 0;
const rel = (a: number, b: number, kind: GcRelationKind): GcRelation =>
  ({ id: ++relId, concept_id: a, related_concept_id: b, kind }) as GcRelation;

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe('checkQuality', () => {
  it('reports nothing on a clean scheme', () => {
    const cs = [concept(1, 'Outcome'), concept(2, 'Output')];
    const issues = checkQuality(
      cs,
      [label(1, 'Result', GcLabelKind.ALT)],
      [rel(2, 1, GcRelationKind.BROADER)],
      'en',
    );
    expect(issues).toEqual([]);
  });

  describe('S14 preferred labels', () => {
    it('errors when two published concepts share a preferred label, case-insensitive', () => {
      const issues = checkQuality(
        [concept(1, 'Outcome'), concept(2, 'OUTCOME ')],
        [],
        [],
        'en',
      );
      expect(
        issues.filter((i) => i.code === QualityCode.DUPLICATE_PREF_LABEL),
      ).toHaveLength(2);
      expect(issues.every((i) => i.severity === 'error')).toBe(true);
    });

    it('allows the same label in different languages and ignores drafts', () => {
      const issues = checkQuality(
        [
          concept(1, 'Impact'),
          concept(2, 'Impact', { language: 'fr' }),
          concept(3, 'Impact', { status: GcConceptStatus.DRAFT }),
        ],
        [],
        [],
        'en',
      );
      expect(codes(issues)).not.toContain(QualityCode.DUPLICATE_PREF_LABEL);
    });

    it('errors when one concept has two preferred labels in one language', () => {
      const issues = checkQuality(
        [concept(1, 'Outcome')],
        [label(1, 'Résultat', GcLabelKind.PREF, 'en')],
        [],
        'en',
      );
      expect(codes(issues)).toContain(QualityCode.DUPLICATE_PREF_LABEL);
    });

    it('accepts a preferred label in another language', () => {
      const issues = checkQuality(
        [concept(1, 'Outcome')],
        [label(1, 'Résultat', GcLabelKind.PREF, 'fr')],
        [],
        'en',
      );
      expect(issues).toEqual([]);
    });
  });

  describe('S13 label overlap', () => {
    it('errors when an alt label equals the preferred label', () => {
      const issues = checkQuality(
        [concept(1, 'Outcome')],
        [label(1, 'outcome', GcLabelKind.ALT)],
        [],
        'en',
      );
      expect(codes(issues)).toEqual([QualityCode.LABEL_OVERLAP]);
    });

    it('errors when the same label is both alt and hidden', () => {
      const issues = checkQuality(
        [concept(1, 'Outcome')],
        [
          label(1, 'Result', GcLabelKind.ALT),
          label(1, 'result', GcLabelKind.HIDDEN),
        ],
        [],
        'en',
      );
      expect(codes(issues)).toEqual([QualityCode.LABEL_OVERLAP]);
    });

    it('accepts the same text as alt in two different languages', () => {
      const issues = checkQuality(
        [concept(1, 'Outcome')],
        [
          label(1, 'Result', GcLabelKind.ALT, 'en'),
          label(1, 'Result', GcLabelKind.HIDDEN, 'fr'),
        ],
        [],
        'en',
      );
      expect(issues).toEqual([]);
    });
  });

  describe('S27 related vs hierarchy', () => {
    it('errors when a concept is related to its grandparent', () => {
      const issues = checkQuality(
        [concept(1, 'A'), concept(2, 'B'), concept(3, 'C')],
        [],
        [
          rel(2, 1, GcRelationKind.BROADER),
          rel(3, 2, GcRelationKind.BROADER),
          rel(1, 3, GcRelationKind.RELATED),
        ],
        'en',
      );
      expect(codes(issues)).toEqual([QualityCode.RELATED_TO_ANCESTOR]);
      expect(issues[0].term_id).toBe(1001);
    });

    it('accepts related siblings', () => {
      const issues = checkQuality(
        [concept(1, 'A'), concept(2, 'B'), concept(3, 'C')],
        [],
        [
          rel(2, 1, GcRelationKind.BROADER),
          rel(3, 1, GcRelationKind.BROADER),
          rel(2, 3, GcRelationKind.RELATED),
        ],
        'en',
      );
      expect(issues).toEqual([]);
    });
  });

  describe('broader cycles', () => {
    it('reports one error per cycle, on its lowest term_id', () => {
      const issues = checkQuality(
        [concept(1, 'A'), concept(2, 'B'), concept(3, 'C')],
        [],
        [
          rel(1, 2, GcRelationKind.BROADER),
          rel(2, 3, GcRelationKind.BROADER),
          rel(3, 1, GcRelationKind.BROADER),
        ],
        'en',
      );
      const cycles = issues.filter((i) => i.code === QualityCode.BROADER_CYCLE);
      expect(cycles).toHaveLength(1);
      expect(cycles[0].term_id).toBe(1001);
      expect(cycles[0].message).toContain('1001, 1002, 1003');
    });

    it('treats a self-broader as a cycle', () => {
      const issues = checkQuality(
        [concept(1, 'A')],
        [],
        [rel(1, 1, GcRelationKind.BROADER)],
        'en',
      );
      expect(codes(issues)).toContain(QualityCode.BROADER_CYCLE);
    });

    it('does not flag a diamond (polyhierarchy is allowed)', () => {
      const issues = checkQuality(
        [concept(1, 'A'), concept(2, 'B'), concept(3, 'C'), concept(4, 'D')],
        [],
        [
          rel(2, 1, GcRelationKind.BROADER),
          rel(3, 1, GcRelationKind.BROADER),
          rel(4, 2, GcRelationKind.BROADER),
          rel(4, 3, GcRelationKind.BROADER),
        ],
        'en',
      );
      expect(issues).toEqual([]);
    });
  });

  describe('editorial rules', () => {
    it('errors on an approved concept without a definition (markup-only counts as empty)', () => {
      const issues = checkQuality(
        [
          concept(1, 'A', { definition: '<br>' }),
          concept(2, 'B', { definition: null }),
        ],
        [],
        [],
        'en',
      );
      expect(codes(issues)).toEqual([
        QualityCode.MISSING_DEFINITION,
        QualityCode.MISSING_DEFINITION,
      ]);
    });

    it('does not require a definition on drafts or deprecated concepts', () => {
      const issues = checkQuality(
        [
          concept(1, 'A', { definition: null, status: GcConceptStatus.DRAFT }),
          concept(2, 'B'),
          concept(3, 'C', {
            definition: null,
            status: GcConceptStatus.DEPRECATED,
            replaced_by_id: 2,
          }),
        ],
        [],
        [],
        'en',
      );
      expect(issues).toEqual([]);
    });

    it('warns on a deprecated concept without replacement', () => {
      const issues = checkQuality(
        [concept(1, 'A', { status: GcConceptStatus.DEPRECATED })],
        [],
        [],
        'en',
      );
      expect(issues).toEqual([
        expect.objectContaining({
          code: QualityCode.DEPRECATED_WITHOUT_REPLACEMENT,
          severity: 'warning',
          term_id: 1001,
        }),
      ]);
    });

    it('errors when replaced_by points to a draft, a deprecated or a missing concept', () => {
      const issues = checkQuality(
        [
          concept(1, 'A', {
            status: GcConceptStatus.DEPRECATED,
            replaced_by_id: 2,
          }),
          concept(2, 'B', { status: GcConceptStatus.DRAFT }),
          concept(3, 'C', {
            status: GcConceptStatus.DEPRECATED,
            replaced_by_id: 1,
          }),
          concept(4, 'D', {
            status: GcConceptStatus.DEPRECATED,
            replaced_by_id: 99,
          }),
        ],
        [],
        [],
        'en',
      );
      const bad = issues.filter(
        (i) => i.code === QualityCode.REPLACED_BY_NOT_APPROVED,
      );
      expect(bad.map((i) => i.term_id)).toEqual([1001, 1003, 1004]);
      expect(bad.every((i) => i.severity === 'error')).toBe(true);
    });

    it('accepts replaced_by pointing to an approved concept', () => {
      const issues = checkQuality(
        [
          concept(1, 'A', {
            status: GcConceptStatus.DEPRECATED,
            replaced_by_id: 2,
          }),
          concept(2, 'B'),
        ],
        [],
        [],
        'en',
      );
      expect(issues).toEqual([]);
    });
  });

  describe('relations outside the scheme', () => {
    it('errors when a published concept relates to a concept that is not in the scheme', () => {
      const issues = checkQuality(
        [concept(1, 'A')],
        [],
        [rel(1, 500, GcRelationKind.RELATED)],
        'en',
      );
      expect(issues).toEqual([
        expect.objectContaining({
          code: QualityCode.RELATION_OUTSIDE_SCHEME,
          severity: 'error',
          term_id: 1001,
        }),
      ]);
    });

    it('errors when both ends are given but belong to different schemes', () => {
      const issues = checkQuality(
        [concept(1, 'A'), concept(2, 'B', { scheme_id: 2 })],
        [],
        [rel(1, 2, GcRelationKind.BROADER)],
        'en',
      );
      expect(codes(issues)).toContain(QualityCode.RELATION_OUTSIDE_SCHEME);
    });

    it('ignores such a relation on a draft (it does not ship)', () => {
      const issues = checkQuality(
        [concept(1, 'A', { status: GcConceptStatus.DRAFT })],
        [],
        [rel(1, 500, GcRelationKind.RELATED)],
        'en',
      );
      expect(issues).toEqual([]);
    });
  });

  describe('V10 deprecated parents', () => {
    it('warns when every broader of an approved concept is deprecated', () => {
      const issues = checkQuality(
        [
          concept(1, 'Parent', {
            status: GcConceptStatus.DEPRECATED,
            replaced_by_id: 3,
          }),
          concept(2, 'Child'),
          concept(3, 'New parent'),
        ],
        [],
        [rel(2, 1, GcRelationKind.BROADER)],
        'en',
      );
      expect(issues).toEqual([
        expect.objectContaining({
          code: QualityCode.ONLY_DEPRECATED_BROADER,
          severity: 'warning',
          term_id: 1002,
        }),
      ]);
    });

    it('does not warn while one broader is still approved', () => {
      const issues = checkQuality(
        [
          concept(1, 'Parent', {
            status: GcConceptStatus.DEPRECATED,
            replaced_by_id: 3,
          }),
          concept(2, 'Child'),
          concept(3, 'New parent'),
        ],
        [],
        [rel(2, 1, GcRelationKind.BROADER), rel(2, 3, GcRelationKind.BROADER)],
        'en',
      );
      expect(issues).toEqual([]);
    });
  });

  it('returns issues in a deterministic order (term_id, then code)', () => {
    const cs = [
      concept(2, 'B', { definition: null }),
      concept(1, 'A', { status: GcConceptStatus.DEPRECATED }),
      concept(3, 'b'),
    ];
    const first = checkQuality(cs, [], [], 'en');
    const second = checkQuality([...cs].reverse(), [], [], 'en');
    expect(second).toEqual(first);
    expect(first.map((i) => [i.term_id, i.code])).toEqual([
      [1001, QualityCode.DEPRECATED_WITHOUT_REPLACEMENT],
      [1002, QualityCode.DUPLICATE_PREF_LABEL],
      [1002, QualityCode.MISSING_DEFINITION],
      [1003, QualityCode.DUPLICATE_PREF_LABEL],
    ]);
  });
});

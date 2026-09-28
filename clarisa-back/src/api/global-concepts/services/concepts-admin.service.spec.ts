import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConceptsAdminService } from './concepts-admin.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import {
  GcLabel,
  GcLabelKind,
  GcLabelStatus,
} from '../entities/gc-label.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import { GcHistory, GcHistoryAction } from '../entities/gc-history.entity';
import {
  GcMapping,
  GcMappingStatus,
  GcMatchType,
} from '../entities/gc-mapping.entity';
import {
  CreateGlobalConcepts1790500000000,
  toValue,
} from '../../../../migrations/1790500000000-CreateGlobalConcepts';

const actor = { email: 'admin@cgiar.org', action: GcHistoryAction.DIRECT_EDIT };

describe('ConceptsAdminService', () => {
  let db: FakeManager;
  let service: ConceptsAdminService;
  let meliaf: GcScheme;

  const seedLists = () => {
    for (const [list, labels] of Object.entries(
      CreateGlobalConcepts1790500000000.LISTS,
    )) {
      labels.forEach((label, sort) =>
        db.seed(GcListValue, {
          scope: '',
          list_code: list,
          value: toValue(label),
          label,
          sort,
          is_active: true,
        }),
      );
    }
  };

  const concept = (
    term_id: number,
    label: string,
    status = GcConceptStatus.APPROVED,
    extra: Partial<GcConcept> = {},
  ) =>
    db.seed(GcConcept, {
      scheme_id: meliaf.id,
      term_id,
      preferred_label: label,
      language: 'en',
      status,
      version: '1.0',
      replaced_by_id: null,
      meliaf_function: [],
      meliaf_phase_also: [],
      validated_by: [],
      ai_generated_fields: [],
      extra: {},
      ...extra,
    });

  beforeEach(() => {
    db = new FakeManager();
    meliaf = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'MELIAF',
      default_language: 'en',
      next_term_id: 1,
      uri_base: null,
    });
    seedLists();
    service = new ConceptsAdminService(
      fakeDataSource(db),
      new ConceptGraphLoader(),
    );
  });

  describe('create', () => {
    it('assigns the next term id and logs the creation', async () => {
      const created = await service.create(
        'meliaf',
        { preferred_label: '  Outcome ' },
        { ...actor, action: GcHistoryAction.CREATE },
      );
      expect(created.term_id).toBe(1);
      expect(created.preferred_label).toBe('Outcome');
      expect(created.status).toBe(GcConceptStatus.DRAFT);
      expect(db.rows(GcHistory)).toHaveLength(1);
      expect(db.rows(GcHistory)[0].action).toBe(GcHistoryAction.CREATE);
      expect(Number(db.rows(GcScheme)[0].next_term_id)).toBe(2);
    });

    it('keeps an existing register code and moves the counter past it', async () => {
      const created = await service.create(
        'meliaf',
        { preferred_label: 'Accountability', term_id: 2374 },
        actor,
      );
      expect(created.term_id).toBe(2374);
      expect(Number(db.rows(GcScheme)[0].next_term_id)).toBe(2375);
    });

    it('refuses a term id already used in the scheme', async () => {
      concept(7, 'Output');
      await expect(
        service.create(
          'meliaf',
          { preferred_label: 'Other', term_id: 7 },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('stores list values from their label and rejects unknown ones', async () => {
      const ok = await service.create(
        'meliaf',
        {
          preferred_label: 'Impact',
          meliaf_function: ['MEL', 'IA (ex ante)'],
          term_type: 'Study type',
        },
        actor,
      );
      expect(ok.meliaf_function).toEqual(['mel', 'ia_ex_ante']);
      expect(ok.term_type).toBe('study_type');
      await expect(
        service.create(
          'meliaf',
          { preferred_label: 'X', meliaf_function: ['MEL+IA'] },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a second live concept with the same preferred label (S14)', async () => {
      concept(1, 'Outcome');
      await expect(
        service.create('meliaf', { preferred_label: 'outcome' }, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows the label of a deprecated concept to be reused', async () => {
      concept(1, 'Outcome', GcConceptStatus.DEPRECATED);
      await expect(
        service.create('meliaf', { preferred_label: 'Outcome' }, actor),
      ).resolves.toBeDefined();
    });
  });

  describe('update and versions', () => {
    it('bumps the version only when a published concept changes', async () => {
      concept(1, 'Outcome', GcConceptStatus.APPROVED);
      concept(2, 'Draft thing', GcConceptStatus.DRAFT);
      const published = await service.update(
        'meliaf',
        1,
        { definition: 'A change.' },
        actor,
      );
      const draft = await service.update(
        'meliaf',
        2,
        { definition: 'Text.' },
        actor,
      );
      expect(published.version).toBe('1.1');
      expect(draft.version).toBe('1.0');
    });

    it('writes no history when nothing changed', async () => {
      concept(1, 'Outcome', GcConceptStatus.APPROVED, { definition: 'Same.' });
      await service.update('meliaf', 1, { definition: 'Same.' }, actor);
      expect(db.rows(GcHistory)).toHaveLength(0);
    });

    it('records before and after of each changed field', async () => {
      concept(1, 'Outcome', GcConceptStatus.APPROVED, { definition: 'Old.' });
      await service.update('meliaf', 1, { definition: 'New.' }, actor);
      expect(db.rows(GcHistory)[0].changes.definition).toEqual({
        from: 'Old.',
        to: 'New.',
      });
    });
  });

  describe('status and deprecation', () => {
    it('needs a replacement or a written reason to deprecate', async () => {
      concept(1, 'Old');
      await expect(
        service.setStatus(
          'meliaf',
          1,
          { status: GcConceptStatus.DEPRECATED },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      const done = await service.setStatus(
        'meliaf',
        1,
        {
          status: GcConceptStatus.DEPRECATED,
          reason: 'Superseded by the 2025 framework',
        },
        actor,
      );
      expect(done.status).toBe(GcConceptStatus.DEPRECATED);
    });

    it('deprecates with an approved replacement and publishes it', async () => {
      concept(1, 'Old');
      concept(2, 'New');
      const done = await service.setStatus(
        'meliaf',
        1,
        { status: GcConceptStatus.DEPRECATED, replaced_by_term_id: 2 },
        actor,
      );
      expect(done.replaced_by?.term_id).toBe(2);
    });

    it.each([
      ['a draft', GcConceptStatus.DRAFT],
      ['a deprecated concept', GcConceptStatus.DEPRECATED],
    ])('refuses %s as replacement', async (_l, status) => {
      concept(1, 'Old');
      concept(2, 'Not usable', status);
      await expect(
        service.setStatus(
          'meliaf',
          1,
          { status: GcConceptStatus.DEPRECATED, replaced_by_term_id: 2 },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a replacement chain that comes back to the concept (V11)', async () => {
      const a = concept(1, 'A');
      concept(2, 'B', GcConceptStatus.APPROVED, { replaced_by_id: a.id });
      await expect(
        service.setStatus(
          'meliaf',
          1,
          { status: GcConceptStatus.DEPRECATED, replaced_by_term_id: 2 },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cannot deprecate without replacement a concept others name as replacement (V36)', async () => {
      const b = concept(2, 'B');
      concept(1, 'A', GcConceptStatus.DEPRECATED, { replaced_by_id: b.id });
      await expect(
        service.setStatus(
          'meliaf',
          2,
          { status: GcConceptStatus.DEPRECATED, reason: 'gone' },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('clears the replacement when leaving deprecated', async () => {
      const b = concept(2, 'B');
      concept(1, 'A', GcConceptStatus.DEPRECATED, { replaced_by_id: b.id });
      const back = await service.setStatus(
        'meliaf',
        1,
        { status: GcConceptStatus.APPROVED },
        actor,
      );
      expect(back.replaced_by).toBeNull();
    });
  });

  describe('labels', () => {
    it('stores alternative, hidden and discouraged labels and publishes them', async () => {
      concept(1, 'Impact assessment');
      const out = await service.setLabels(
        'meliaf',
        1,
        {
          labels: [
            { label: 'IA', kind: GcLabelKind.ACRONYM },
            { label: 'Impact assesment', kind: GcLabelKind.HIDDEN },
            {
              label: 'Impact study',
              kind: GcLabelKind.ALT,
              status: GcLabelStatus.DISCOURAGED,
            },
            {
              label: 'Évaluation d’impact',
              kind: GcLabelKind.PREF,
              language: 'fr',
            },
          ],
        },
        actor,
      );
      expect(out.alternative_labels.map((l) => l.label)).toEqual([
        'IA',
        'Impact assesment',
        'Impact study',
      ]);
      expect(out.alternative_labels[2].discouraged).toBe(true);
      expect(out.preferred_labels).toEqual([
        { label: 'Impact assessment', language: 'en' },
        { label: 'Évaluation d’impact', language: 'fr' },
      ]);
    });

    it('refuses a preferred label in the default language (V4) and a label equal to the preferred one (S13)', async () => {
      concept(1, 'Outcome');
      await expect(
        service.setLabels(
          'meliaf',
          1,
          { labels: [{ label: 'Result', kind: GcLabelKind.PREF }] },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.setLabels(
          'meliaf',
          1,
          { labels: [{ label: 'outcome', kind: GcLabelKind.ALT }] },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an unknown language', async () => {
      concept(1, 'Outcome');
      await expect(
        service.setLabels(
          'meliaf',
          1,
          {
            labels: [
              { label: 'Resultado', kind: GcLabelKind.ALT, language: 'pt' },
            ],
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('relations', () => {
    it('refuses a self relation, a cycle and a cross-scheme link', async () => {
      concept(1, 'Evaluation');
      concept(2, 'Impact evaluation');
      await expect(
        service.addRelation(
          'meliaf',
          1,
          { kind: GcRelationKind.BROADER, target_term_id: 1 },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await service.addRelation(
        'meliaf',
        2,
        { kind: GcRelationKind.BROADER, target_term_id: 1 },
        actor,
      );
      await expect(
        service.addRelation(
          'meliaf',
          1,
          { kind: GcRelationKind.BROADER, target_term_id: 2 },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      const other = db.seed(GcScheme, {
        code: 'prms',
        title: 'PRMS',
        default_language: 'en',
        next_term_id: 1,
        uri_base: null,
      });
      const foreign = db.seed(GcConcept, {
        scheme_id: other.id,
        term_id: 9,
        preferred_label: 'X',
        language: 'en',
        status: GcConceptStatus.APPROVED,
      });
      await expect(
        service.addRelationIn(
          db as any,
          db.rows(GcConcept)[0],
          foreign,
          GcRelationKind.RELATED,
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses related between a concept and its ancestor, both ways (S27)', async () => {
      concept(1, 'Evaluation');
      concept(2, 'Impact evaluation');
      concept(3, 'Ex-ante impact evaluation');
      await service.addRelation(
        'meliaf',
        2,
        { kind: GcRelationKind.BROADER, target_term_id: 1 },
        actor,
      );
      await service.addRelation(
        'meliaf',
        3,
        { kind: GcRelationKind.BROADER, target_term_id: 2 },
        actor,
      );
      await expect(
        service.addRelation(
          'meliaf',
          3,
          { kind: GcRelationKind.RELATED, target_term_id: 1 },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.addRelation(
          'meliaf',
          1,
          { kind: GcRelationKind.RELATED, target_term_id: 3 },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores related once with the lower id first and shows it on both concepts', async () => {
      concept(1, 'Outcome');
      concept(2, 'Output');
      await service.addRelation(
        'meliaf',
        2,
        { kind: GcRelationKind.RELATED, target_term_id: 1 },
        actor,
      );
      await service.addRelation(
        'meliaf',
        1,
        { kind: GcRelationKind.RELATED, target_term_id: 2 },
        actor,
      );
      expect(db.rows(GcRelation)).toHaveLength(1);
      expect(Number(db.rows(GcRelation)[0].concept_id)).toBeLessThan(
        Number(db.rows(GcRelation)[0].related_concept_id),
      );
      const one = await service.get('meliaf', 1);
      expect(one.related_terms.map((r) => r.term_id)).toEqual([2]);
    });

    it('derives narrower terms from broader ones', async () => {
      concept(1, 'Evaluation');
      concept(2, 'Impact evaluation');
      await service.addRelation(
        'meliaf',
        2,
        { kind: GcRelationKind.BROADER, target_term_id: 1 },
        actor,
      );
      const parent = await service.get('meliaf', 1);
      expect(parent.narrower_terms.map((r) => r.term_id)).toEqual([2]);
    });
  });

  describe('merge', () => {
    it('moves labels, relations and mappings, deprecates the source and repoints its dependants', async () => {
      const a = concept(1, 'Result');
      const b = concept(2, 'Outcome');
      const c = concept(3, 'Output');
      const old = concept(4, 'Old outcome', GcConceptStatus.DEPRECATED, {
        replaced_by_id: a.id,
      });
      db.seed(GcLabel, {
        concept_id: a.id,
        label: 'Outcome',
        language: 'en',
        kind: GcLabelKind.ALT,
        status: GcLabelStatus.ACTIVE,
      });
      db.seed(GcLabel, {
        concept_id: a.id,
        label: 'Results',
        language: 'en',
        kind: GcLabelKind.ALT,
        status: GcLabelStatus.ACTIVE,
      });
      db.seed(GcRelation, {
        concept_id: Math.min(Number(a.id), Number(c.id)),
        related_concept_id: Math.max(Number(a.id), Number(c.id)),
        kind: GcRelationKind.RELATED,
      });
      db.seed(GcRelation, {
        concept_id: Math.min(Number(a.id), Number(b.id)),
        related_concept_id: Math.max(Number(a.id), Number(b.id)),
        kind: GcRelationKind.RELATED,
      });
      db.seed(GcMapping, {
        concept_id: a.id,
        target_scheme: 'agrovoc',
        target_uri: 'http://aims.fao.org/aos/agrovoc/c_1',
        match_type: GcMatchType.CLOSE,
        status: GcMappingStatus.APPROVED,
      });

      const survivor = await service.merge(
        'meliaf',
        1,
        { into_term_id: 2 },
        actor,
      );

      const labels = survivor.alternative_labels.map((l) => l.label).sort();
      expect(labels).toEqual(['Result', 'Results']); // "Outcome" was the survivor's own label
      expect(survivor.related_terms.map((r) => r.term_id)).toEqual([3]); // no self-relation
      expect(survivor.mappings.map((m) => m.target_uri)).toEqual([
        'http://aims.fao.org/aos/agrovoc/c_1',
      ]);
      const source = db.rows(GcConcept).find((x) => x.term_id === 1)!;
      expect(source.status).toBe(GcConceptStatus.DEPRECATED);
      expect(Number(source.replaced_by_id)).toBe(Number(b.id));
      expect(Number(old.replaced_by_id)).toBe(Number(b.id));
      const txIds = new Set(
        db
          .rows(GcHistory)
          .filter(
            (h) =>
              h.action === GcHistoryAction.DIRECT_EDIT ||
              h.action === GcHistoryAction.MERGE,
          )
          .map((h) => h.tx_id),
      );
      expect(txIds.size).toBe(1);
    });

    it('refuses to merge into a concept that is not approved', async () => {
      concept(1, 'A');
      concept(2, 'B', GcConceptStatus.DRAFT);
      await expect(
        service.merge('meliaf', 1, { into_term_id: 2 }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('never publishes internal notes or editor emails in the public shape', async () => {
    concept(1, 'Outcome', GcConceptStatus.APPROVED, {
      notes: 'legal issue',
      created_by_email: 'x@cgiar.org',
    });
    const { presentConcepts } = await import('../utils/concept-presenter');
    const graph = await new ConceptGraphLoader().load(
      db as any,
      meliaf,
      db.rows(GcConcept),
    );
    const [pub] = presentConcepts(graph, () => true);
    expect(JSON.stringify(pub)).not.toContain('legal issue');
    expect(JSON.stringify(pub)).not.toContain('x@cgiar.org');
  });
});

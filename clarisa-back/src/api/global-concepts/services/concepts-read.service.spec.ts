import { NotFoundException } from '@nestjs/common';
import {
  ConceptsReadService,
  likePattern,
  rankByRelevance,
} from './concepts-read.service';
import { PublicConcept } from '../utils/concept-presenter';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcHistory, GcHistoryAction } from '../entities/gc-history.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import { GcRelease } from '../entities/gc-release.entity';

describe('ConceptsReadService', () => {
  let db: FakeManager;
  let service: ConceptsReadService;
  let scheme: GcScheme;

  const concept = (
    term_id: number,
    label: string,
    status: GcConceptStatus,
    extra: Partial<GcConcept> = {},
  ) =>
    db.seed(GcConcept, {
      scheme_id: scheme.id,
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
    scheme = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'MELIAF',
      default_language: 'en',
      next_term_id: 1,
      uri_base: null,
    });
    service = new ConceptsReadService(
      fakeDataSource(db),
      new ConceptGraphLoader(),
    );
  });

  it('serves an approved concept with its persistent URI', async () => {
    concept(2374, 'Accountability', GcConceptStatus.APPROVED);
    const c = await service.get('meliaf', 2374);
    expect(c.term_uri).toBe(
      'https://api.clarisa.cgiar.org/concepts/meliaf/2374',
    );
  });

  it.each([GcConceptStatus.DRAFT, GcConceptStatus.IN_REVIEW])(
    'answers 404 for a %s concept',
    async (status) => {
      concept(1, 'Secret', status);
      await expect(service.get('meliaf', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.history('meliaf', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it('keeps a deprecated concept resolvable with its replacement', async () => {
    const neu = concept(2, 'New', GcConceptStatus.APPROVED);
    concept(1, 'Old', GcConceptStatus.DEPRECATED, { replaced_by_id: neu.id });
    const old = await service.get('meliaf', 1);
    expect(old.status).toBe('deprecated');
    expect(old.replaced_by?.term_id).toBe(2);
  });

  it('never exposes a draft through a relation of a published concept', async () => {
    const pub = concept(1, 'Public', GcConceptStatus.APPROVED);
    const draft = concept(2, 'Draft child', GcConceptStatus.DRAFT);
    db.seed(GcRelation, {
      concept_id: draft.id,
      related_concept_id: pub.id,
      kind: GcRelationKind.BROADER,
    });
    const c = await service.get('meliaf', 1);
    expect(c.narrower_terms).toEqual([]);
  });

  it('publishes history without the editor and without internal notes', async () => {
    const c = concept(1, 'Outcome', GcConceptStatus.APPROVED);
    db.seed(GcHistory, {
      concept_id: c.id,
      action: GcHistoryAction.UPDATE,
      changed_by_email: 'admin@cgiar.org',
      changed_at: new Date(),
      changes: {
        definition: { from: 'a', to: 'b' },
        notes: { from: null, to: 'internal' },
      },
    });
    const [entry] = await service.history('meliaf', 1);
    expect(entry.changes).toEqual({ definition: { from: 'a', to: 'b' } });
    expect(JSON.stringify(entry)).not.toContain('admin@cgiar.org');
  });

  it('serves a concept as frozen in a release when pinned', async () => {
    concept(1, 'Outcome', GcConceptStatus.APPROVED, { definition: 'Now' });
    db.seed(GcRelease, {
      scheme_id: scheme.id,
      version: '1.0.0',
      release_uri: 'x',
      snapshot: JSON.stringify([
        {
          term_id: 1,
          preferred_label: 'Outcome',
          definition: 'Then',
          status: 'approved',
          alternative_labels: [],
          meliaf_function: [],
          meliaf_phase_also: [],
        },
      ]),
    });
    const pinned = await service.get('meliaf', 1, '1.0.0');
    expect(pinned.definition).toBe('Then');
    await expect(service.get('meliaf', 1, '9.9.9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('answers 404 for an unknown scheme', async () => {
    await expect(service.get('nope', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('escapes LIKE wildcards in searches', () => {
    expect(likePattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%');
  });
});

describe('rankByRelevance', () => {
  const c = (
    term_id: number,
    preferred_label: string,
    alts: string[] = [],
    definition = '',
  ) =>
    ({
      term_id,
      preferred_label,
      alternative_labels: alts.map((label) => ({ label, kind: 'alt' })),
      definition,
    }) as unknown as PublicConcept;

  it('puts the acronym match above definitions that only contain the letters', () => {
    const ranked = rankByRelevance(
      [
        c(1, 'Action Area', [], 'Genetic innovation in Asia'),
        c(2, 'Adoption', [], 'social innovations'),
        c(3, 'Impact assessment', ['IA']),
      ],
      'IA',
    );
    expect(ranked.map((x) => x.term_id)).toEqual([3, 1, 2]);
  });

  it('ranks exact, then prefix, then word-start matches', () => {
    const ranked = rankByRelevance(
      [
        c(1, 'Participatory evaluation'),
        c(2, 'Evaluation'),
        c(3, 'Evaluation design'),
        c(4, 'Reevaluation'),
      ],
      'evaluation',
    );
    expect(ranked.map((x) => x.term_id)).toEqual([2, 3, 1, 4]);
  });
});

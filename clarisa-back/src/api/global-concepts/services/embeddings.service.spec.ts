import { EmbeddingsService, cosine, embeddingText } from './embeddings.service';
import { AiService } from './ai.service';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcEmbedding } from '../entities/gc-embedding.entity';

/** A fake embedder: each text becomes a vector from its words, so similar texts point the same way. */
const WORDS = ['outcome', 'change', 'output', 'product', 'impact', 'effect'];
const vectorOf = (text: string) =>
  WORDS.map((w) => (text.toLowerCase().includes(w) ? 1 : 0));

describe('EmbeddingsService', () => {
  let db: FakeManager;
  let ai: { embed: jest.Mock };
  let service: EmbeddingsService;
  let scheme: GcScheme;

  const concept = (
    term_id: number,
    preferred_label: string,
    definition: string,
    status = GcConceptStatus.APPROVED,
  ) =>
    db.seed(GcConcept, {
      scheme_id: scheme.id,
      term_id,
      preferred_label,
      definition,
      status,
    });

  beforeEach(() => {
    db = new FakeManager();
    scheme = db.seed(GcScheme, { code: 'meliaf', title: 'MELIAF' });
    ai = {
      embed: jest.fn(async (texts: string[]) => texts.map(vectorOf)),
    };
    service = new EmbeddingsService(
      fakeDataSource(db),
      ai as unknown as AiService,
    );
  });

  it('measures cosine similarity', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });

  it('embeds label and definition, and only pays again for changed concepts', async () => {
    const a = concept(1, 'Outcome', 'A change in behaviour');
    concept(2, 'Output', 'A product delivered');
    concept(3, 'Old', 'gone', GcConceptStatus.DEPRECATED);
    expect(await service.refresh(scheme)).toEqual({
      embedded: 2,
      unchanged: 0,
    });
    expect(ai.embed.mock.calls[0][0]).toEqual([
      embeddingText(a),
      'Output: A product delivered',
    ]);
    expect(await service.refresh(scheme)).toEqual({
      embedded: 0,
      unchanged: 2,
    });
    a.definition = 'An effect';
    expect(await service.refresh(scheme)).toEqual({
      embedded: 1,
      unchanged: 1,
    });
    expect(db.rows(GcEmbedding)).toHaveLength(2);
  });

  it('ranks the closest concepts and leaves out the one being edited', async () => {
    const outcome = concept(1, 'Outcome', 'A change in behaviour');
    concept(2, 'Output', 'A product delivered');
    await service.refresh(scheme);
    const hits = await service.search(
      scheme,
      'outcome: the change that follows',
    );
    expect(hits[0]).toMatchObject({ term_id: 1 });
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
    const others = await service.search(
      scheme,
      'outcome change',
      5,
      Number(outcome.id),
    );
    expect(others.map((h) => h.term_id)).toEqual([2]);
  });

  it('answers nothing, without calling the model, before any refresh', async () => {
    concept(1, 'Outcome', 'A change');
    expect(await service.search(scheme, 'outcome')).toEqual([]);
    expect(ai.embed).not.toHaveBeenCalled();
  });
});

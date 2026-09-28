import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource, In, Not } from 'typeorm';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcEmbedding } from '../entities/gc-embedding.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GlobalConceptsConfig } from '../global-concepts.config';
import { AiService } from './ai.service';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** What is embedded for a concept: its label and definition, nothing internal. */
export const embeddingText = (c: {
  preferred_label: string;
  definition?: string | null;
}) =>
  `${c.preferred_label}${c.definition ? `: ${c.definition}` : ''}`.slice(
    0,
    8000,
  );

export const cosine = (a: number[], b: number[]) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

export interface SemanticHit {
  term_id: number;
  preferred_label: string;
  status: string;
  score: number;
}

/**
 * Semantic similarity over a scheme (task 3.4): near-duplicate detection for
 * requests and a semantic search for editors. Vectors are derived data kept
 * in `gc_embeddings`; `refresh` only pays for concepts whose text changed.
 * The query text of `search` is embedded and discarded, never stored (V43).
 */
@Injectable()
export class EmbeddingsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ai: AiService,
  ) {}

  async refresh(scheme: GcScheme) {
    const manager = this.dataSource.manager;
    const model = GlobalConceptsConfig.aiEmbeddingModel;
    const concepts = await manager.find(GcConcept, {
      where: { scheme_id: scheme.id, status: Not(GcConceptStatus.DEPRECATED) },
    });
    if (!concepts.length) return { embedded: 0, unchanged: 0 };
    const stored = await manager.find(GcEmbedding, {
      where: { concept_id: In(concepts.map((c) => Number(c.id))), model },
    });
    const byId = new Map(stored.map((e) => [Number(e.concept_id), e]));
    const stale = concepts.filter(
      (c) => byId.get(Number(c.id))?.text_hash !== sha(embeddingText(c)),
    );
    if (stale.length) {
      const vectors = await this.ai.embed(stale.map(embeddingText));
      // Replace, not upsert: one row per (concept, model) on any driver.
      await manager.delete(GcEmbedding, {
        concept_id: In(stale.map((c) => Number(c.id))),
        model,
      });
      await manager.save(
        GcEmbedding,
        stale.map((c, i) =>
          manager.create(GcEmbedding, {
            concept_id: Number(c.id),
            model,
            text_hash: sha(embeddingText(c)),
            vector: vectors[i],
          }),
        ),
      );
    }
    return {
      embedded: stale.length,
      unchanged: concepts.length - stale.length,
    };
  }

  /** Closest concepts to a text; empty when the scheme has no vectors yet. */
  async search(
    scheme: GcScheme,
    text: string,
    k = 8,
    exceptId?: number,
  ): Promise<SemanticHit[]> {
    const manager = this.dataSource.manager;
    const model = GlobalConceptsConfig.aiEmbeddingModel;
    const concepts = await manager.find(GcConcept, {
      where: { scheme_id: scheme.id, status: Not(GcConceptStatus.DEPRECATED) },
    });
    const ids = concepts
      .map((c) => Number(c.id))
      .filter((id) => id !== exceptId);
    if (!ids.length || !text.trim()) return [];
    const stored = await manager.find(GcEmbedding, {
      where: { concept_id: In(ids), model },
    });
    if (!stored.length) return [];
    const [query] = await this.ai.embed([text.slice(0, 8000)]);
    const byId = new Map(concepts.map((c) => [Number(c.id), c]));
    return stored
      .map((e) => ({
        c: byId.get(Number(e.concept_id)),
        score: cosine(query, e.vector),
      }))
      .filter((x): x is { c: GcConcept; score: number } => !!x.c)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(50, k)))
      .map(({ c, score }) => ({
        term_id: Number(c.term_id),
        preferred_label: c.preferred_label,
        status: c.status,
        score: Math.round(score * 1000) / 1000,
      }));
  }
}

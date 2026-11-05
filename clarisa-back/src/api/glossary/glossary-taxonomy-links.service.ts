import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  DEFAULT_SCHEME_CODE,
  conceptUri,
} from '../global-concepts/global-concepts.config';
import {
  GC_PUBLIC_STATUSES,
  GcConceptStatus,
} from '../global-concepts/entities/gc-concept.entity';

/** Code of the taxonomy collection that holds the copy of the glossary. */
export const GLOSSARY_COLLECTION_CODE = 'glossary';

/** What the taxonomy knows about one glossary term. */
export interface GlossaryTaxonomyLink {
  termUri: string;
  taxonomyStatus: GcConceptStatus;
}

/**
 * Bridges a glossary term to its concept in the taxonomy.
 *
 * Since 2026-11-03 every glossary term has a copy in the `meliaf-taxonomy`
 * scheme, collection `glossary`, with `term_id` equal to the glossary `id`
 * (migration 1793404800000). This reads that copy only — it never writes.
 *
 * A term created after the copy has no concept yet and simply gets no link.
 * Only public concepts (approved / deprecated) give a link: a draft is
 * never announced through the glossary.
 */
@Injectable()
export class GlossaryTaxonomyLinksService {
  private readonly logger = new Logger(GlossaryTaxonomyLinksService.name);

  constructor(private readonly dataSource: DataSource) {}

  async linksFor(
    termIds: number[],
  ): Promise<Map<number, GlossaryTaxonomyLink>> {
    const links = new Map<number, GlossaryTaxonomyLink>();
    const ids = [...new Set(termIds.filter((id) => Number.isFinite(id)))];
    if (!ids.length) return links;

    const rows: {
      term_id: number | string;
      status: GcConceptStatus;
      code: string;
      uri_base: string | null;
    }[] = await this.dataSource.query(
      `SELECT c.term_id, c.status, s.code, s.uri_base
         FROM gc_concepts c
         JOIN gc_schemes s ON s.id = c.scheme_id
         JOIN gc_collection_members m ON m.concept_id = c.id
         JOIN gc_collections col
           ON col.id = m.collection_id AND col.scheme_id = s.id
        WHERE s.code = ?
          AND col.code = ?
          AND c.status IN (${GC_PUBLIC_STATUSES.map(() => '?').join(', ')})
          AND c.term_id IN (${ids.map(() => '?').join(', ')})`,
      [
        DEFAULT_SCHEME_CODE,
        GLOSSARY_COLLECTION_CODE,
        ...GC_PUBLIC_STATUSES,
        ...ids,
      ],
    );

    for (const row of rows) {
      const termId = Number(row.term_id);
      links.set(termId, {
        termUri: conceptUri({ code: row.code, uri_base: row.uri_base }, termId),
        taxonomyStatus: row.status,
      });
    }
    return links;
  }

  /**
   * Same as `linksFor`, but a taxonomy that cannot be read (tables missing in
   * an environment, a failing query) leaves every term without a link instead
   * of breaking the glossary. The failure is logged, never swallowed silently.
   */
  async linksForOrEmpty(
    termIds: number[],
  ): Promise<Map<number, GlossaryTaxonomyLink>> {
    try {
      return await this.linksFor(termIds);
    } catch (error) {
      this.logger.warn(
        `Glossary v2 served without taxonomy links: ${(error as Error)?.message ?? error}`,
      );
      return new Map();
    }
  }
}

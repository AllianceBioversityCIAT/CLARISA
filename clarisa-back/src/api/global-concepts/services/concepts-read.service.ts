import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import {
  GC_PUBLIC_STATUSES,
  GcConcept,
  GcConceptStatus,
} from '../entities/gc-concept.entity';
import {
  GcCollection,
  GcCollectionMember,
} from '../entities/gc-collection.entity';
import { GcHistory } from '../entities/gc-history.entity';
import { GcLabel, GcLabelKind } from '../entities/gc-label.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GcRelease } from '../entities/gc-release.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcField } from '../entities/gc-field.entity';
import { schemeUri } from '../global-concepts.config';
import { PublicConcept, presentConcepts } from '../utils/concept-presenter';
import { CUSTOM_COLUMN_PREFIX, publicFields } from '../utils/custom-fields';
import { ConceptGraphLoader } from './concept-graph.loader';
import {
  SearchDoc,
  SearchMatch,
  searchConcepts,
} from '../utils/concept-search';

export interface ConceptQuery {
  q?: string;
  status?: string;
  functions?: string;
  phase?: string;
  term_type?: string;
  collection?: string;
  version?: string;
}

const isPublic = (c: GcConcept) => GC_PUBLIC_STATUSES.includes(c.status);

/** Escapes `%`, `_` and `\` for a MySQL LIKE pattern. */
export const likePattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/** Search documents of already presented concepts (release snapshots, other callers). */
export function searchDocsOf(concepts: PublicConcept[]): SearchDoc[] {
  return concepts.map((c, i) => ({
    id: c.term_id,
    order: i,
    texts: [
      { field: 'term_id' as const, text: String(c.term_id) },
      { field: 'preferred_label' as const, text: c.preferred_label },
      ...(c.preferred_labels ?? [])
        .slice(1)
        .map((l) => ({ field: 'alternative_labels' as const, text: l.label })),
      ...(c.alternative_labels ?? []).map((l) => ({
        field:
          l.kind === GcLabelKind.HIDDEN
            ? ('hidden_labels' as const)
            : ('alternative_labels' as const),
        text: l.label,
      })),
      { field: 'short_definition' as const, text: c.short_definition ?? '' },
      { field: 'definition' as const, text: c.definition ?? '' },
    ],
  }));
}

/** A search hit carries how it matched: tier, score and the ranges to highlight. */
export type SearchedConcept = PublicConcept & { match?: SearchMatch };

/**
 * Text search over presented concepts (see `utils/concept-search`): only the
 * matches, best first, each with its `match`. Kept under its old name for callers.
 */
export function rankByRelevance(
  concepts: PublicConcept[],
  q: string,
): SearchedConcept[] {
  const byId = new Map(concepts.map((c) => [c.term_id, c]));
  return searchConcepts(searchDocsOf(concepts), q).map((hit) => ({
    ...byId.get(hit.id),
    match: hit.match,
  }));
}

/**
 * Public, read-only side of the module. Only approved and deprecated concepts
 * are ever returned; drafts and concepts under review do not exist here.
 */
@Injectable()
export class ConceptsReadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly loader: ConceptGraphLoader,
  ) {}

  async schemes() {
    const schemes = await this.dataSource.manager.find(GcScheme, {
      order: { code: 'ASC' },
    });
    return schemes.map((s) => this.presentScheme(s));
  }

  presentScheme(s: GcScheme) {
    return {
      code: s.code,
      uri: schemeUri(s),
      title: s.title,
      description: s.description,
      default_language: s.default_language,
      license: s.license,
      publisher: s.publisher,
      governance_description: s.governance_description,
      owner_platform: s.owner_platform,
      // Whether requests go through a validation step before approval (additive, 2026-09-28).
      validator_required: !!s.validator_required,
    };
  }

  async scheme(code: string) {
    return this.presentScheme(
      await this.loader.scheme(this.dataSource.manager, code),
    );
  }

  /** Live list, or the list as frozen in a release when `version` is given (V23). */
  async list(code: string, query: ConceptQuery = {}): Promise<PublicConcept[]> {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    if (query.version) {
      const pinned = this.filterSnapshot(
        await this.releaseConcepts(scheme, query.version),
        query,
      );
      const text = (query.q ?? '').trim();
      return text ? rankByRelevance(pinned, text) : pinned;
    }

    const qb = manager
      .createQueryBuilder(GcConcept, 'c')
      .where('c.scheme_id = :scheme', { scheme: scheme.id })
      .andWhere('c.status IN (:...statuses)', {
        statuses: this.statusesFor(query.status),
      });
    if (query.term_type) {
      qb.andWhere('c.term_type = :type', { type: query.term_type });
    }
    if (query.phase) {
      qb.andWhere(
        '(c.phase_primary = :phase OR c.phase_also LIKE :phaseLike)',
        {
          phase: query.phase,
          phaseLike: likePattern(`"${query.phase}"`),
        },
      );
    }
    if (query.functions) {
      qb.andWhere('c.functions LIKE :fn', {
        fn: likePattern(`"${query.functions}"`),
      });
    }
    if (query.collection) {
      const collection = await manager.findOne(GcCollection, {
        where: { scheme_id: scheme.id, code: query.collection },
      });
      if (!collection) return [];
      const members = await manager.find(GcCollectionMember, {
        where: { collection_id: collection.id },
      });
      if (!members.length) return [];
      qb.andWhere('c.id IN (:...members)', {
        members: members.map((m) => Number(m.concept_id)),
      });
    }
    const q = (query.q ?? '').trim();
    const concepts = await qb.orderBy('c.preferred_label', 'ASC').getMany();
    if (!q) {
      const graph = await this.loader.load(manager, scheme, concepts);
      return presentConcepts(graph, isPublic);
    }
    return this.search(manager, scheme, concepts, q);
  }

  /**
   * Ranks the filtered concepts on their texts alone (labels, alternative and
   * hidden labels, definition), then loads the full graph only for the hits,
   * so a search costs one label query plus the graph of what it returns.
   */
  private async search(
    manager: DataSource['manager'],
    scheme: GcScheme,
    concepts: GcConcept[],
    q: string,
  ): Promise<SearchedConcept[]> {
    if (!concepts.length) return [];
    const labels = await manager.find(GcLabel, {
      select: { concept_id: true, label: true, kind: true },
      where: { concept_id: In(concepts.map((c) => Number(c.id))) },
    });
    const labelsOf = new Map<number, GcLabel[]>();
    for (const l of labels) {
      const id = Number(l.concept_id);
      labelsOf.set(id, [...(labelsOf.get(id) ?? []), l]);
    }
    const docs: SearchDoc[] = concepts.map((c, i) => ({
      id: Number(c.id),
      order: i,
      texts: [
        { field: 'term_id', text: String(c.term_id) },
        { field: 'preferred_label', text: c.preferred_label },
        ...(labelsOf.get(Number(c.id)) ?? []).map((l) => ({
          // Hidden labels (misspellings kept on purpose) match but are never shown as "matched".
          field:
            l.kind === GcLabelKind.HIDDEN
              ? ('hidden_labels' as const)
              : ('alternative_labels' as const),
          text: l.label,
        })),
        { field: 'short_definition', text: c.short_definition ?? '' },
        { field: 'definition', text: c.definition ?? '' },
      ],
    }));
    const hits = searchConcepts(docs, q);
    if (!hits.length) return [];
    const byId = new Map(concepts.map((c) => [Number(c.id), c]));
    const graph = await this.loader.load(
      manager,
      scheme,
      hits.map((h) => byId.get(h.id)),
    );
    const presented = new Map(
      presentConcepts(graph, isPublic).map((c) => [c.term_id, c]),
    );
    const out: SearchedConcept[] = [];
    for (const h of hits) {
      const c = presented.get(Number(byId.get(h.id).term_id));
      if (c) out.push({ ...c, match: h.match });
    }
    return out;
  }

  async get(code: string, termId: number, version?: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    if (version) {
      const hit = (await this.releaseConcepts(scheme, version)).find(
        (c) => c.term_id === Number(termId),
      );
      if (!hit) throw this.notFound(code, termId);
      return hit;
    }
    const concept = await manager.findOne(GcConcept, {
      where: { scheme_id: scheme.id, term_id: termId },
    });
    if (!concept || !isPublic(concept)) throw this.notFound(code, termId);
    const graph = await this.loader.load(manager, scheme, [concept]);
    return presentConcepts(graph, isPublic)[0];
  }

  /** Public change log of one concept: what changed and when, never who. */
  async history(code: string, termId: number) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const concept = await manager.findOne(GcConcept, {
      where: { scheme_id: scheme.id, term_id: termId },
    });
    if (!concept || !isPublic(concept)) throw this.notFound(code, termId);
    const rows = await manager.find(GcHistory, {
      where: { concept_id: concept.id },
      order: { id: 'ASC' },
    });
    const shown = new Set(
      publicFields(await this.loader.fields(manager, scheme)).map(
        (f) => f.code,
      ),
    );
    return rows.map((h) => ({
      action: h.action,
      changes: this.publicChanges(h.changes, shown),
      changed_at: h.changed_at,
    }));
  }

  /**
   * Incremental sync (D11): every history row after `since` (an opaque
   * cursor, the history id — V31) for concepts that are public now.
   */
  async changes(code: string, since = 0, limit = 500) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const rows = await manager
      .createQueryBuilder(GcHistory, 'h')
      .innerJoin(GcConcept, 'c', 'c.id = h.concept_id')
      .where('c.scheme_id = :scheme', { scheme: scheme.id })
      .andWhere('h.id > :since', { since: Number(since) || 0 })
      .andWhere('c.status IN (:...statuses)', { statuses: GC_PUBLIC_STATUSES })
      .select([
        // `cursor` is a reserved word in MySQL: as a bare alias it broke the query.
        'h.id AS change_cursor',
        'c.term_id AS term_id',
        'h.action AS action',
        'h.changed_at AS changed_at',
      ])
      .orderBy('h.id', 'ASC')
      .limit(Math.min(Math.max(Number(limit) || 500, 1), 1000))
      .getRawMany<{
        change_cursor: string;
        term_id: string;
        action: string;
        changed_at: Date;
      }>();
    return {
      changes: rows.map((r) => ({
        cursor: Number(r.change_cursor),
        term_id: Number(r.term_id),
        action: r.action,
        changed_at: r.changed_at,
      })),
      next_cursor: rows.length
        ? Number(rows[rows.length - 1].change_cursor)
        : Number(since) || 0,
    };
  }

  async releases(code: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const rows = await manager.find(GcRelease, {
      where: { scheme_id: scheme.id },
      order: { id: 'DESC' },
      select: [
        'id',
        'version',
        'release_uri',
        'previous_release_id',
        'released_at',
        'notes',
        'license',
      ],
    });
    const byId = new Map(rows.map((r) => [Number(r.id), r]));
    return rows.map((r) => ({
      version: r.version,
      release_uri: r.release_uri,
      previous_version: r.previous_release_id
        ? (byId.get(Number(r.previous_release_id))?.version ?? null)
        : null,
      released_at: r.released_at,
      notes: r.notes,
      license: r.license,
    }));
  }

  /** Controlled lists, shared ones plus those scoped to the scheme. */
  async lists(code?: string) {
    const scopes = code ? ['', code.toLowerCase()] : [''];
    const rows = await this.dataSource.manager.find(GcListValue, {
      where: { scope: In(scopes), is_active: true },
      order: { list_code: 'ASC', sort: 'ASC' },
    });
    const out: Record<string, { value: string; label: string }[]> = {};
    for (const r of rows) {
      (out[r.list_code] ??= []).push({ value: r.value, label: r.label });
    }
    return out;
  }

  // ---------------------------------------------------------------- helpers

  private statusesFor(status?: string): GcConceptStatus[] {
    if (status === GcConceptStatus.APPROVED) return [GcConceptStatus.APPROVED];
    if (status === GcConceptStatus.DEPRECATED)
      return [GcConceptStatus.DEPRECATED];
    return GC_PUBLIC_STATUSES;
  }

  private async releaseConcepts(scheme: GcScheme, version: string) {
    const release = await this.dataSource.manager.findOne(GcRelease, {
      where: { scheme_id: scheme.id, version },
    });
    if (!release) {
      throw new NotFoundException(
        `Release ${version} of "${scheme.code}" was not found`,
      );
    }
    return JSON.parse(release.snapshot) as PublicConcept[];
  }

  private filterSnapshot(concepts: PublicConcept[], query: ConceptQuery) {
    return concepts.filter((c) => {
      if (query.status && c.status !== query.status) return false;
      if (query.term_type && c.term_type !== query.term_type) return false;
      if (query.functions && !c.functions.includes(query.functions))
        return false;
      if (
        query.phase &&
        c.phase_primary !== query.phase &&
        !c.phase_also.includes(query.phase)
      ) {
        return false;
      }
      // The text itself is matched by rankByRelevance (same three tiers as the live list).
      return true;
    });
  }

  /**
   * Drops internal fields that must never reach the public history. The raw
   * `extra` diff is admin-only (it carries non-public fields and reserved
   * keys); what is public of it is republished as one `x:<code>` change per
   * active public field that actually changed.
   */
  private publicChanges(
    changes: Record<string, { from: unknown; to: unknown }>,
    publicCodes: Set<string> = new Set(),
  ) {
    const out = { ...(changes ?? {}) };
    delete out.notes;
    delete out.updated_by_email;
    delete out.created_by_email;
    const extra = out.extra;
    delete out.extra;
    if (extra) {
      const side = (v: unknown) =>
        v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
      for (const code of publicCodes) {
        const from = side(extra.from)[code] ?? null;
        const to = side(extra.to)[code] ?? null;
        if (JSON.stringify(from) !== JSON.stringify(to))
          out[`${CUSTOM_COLUMN_PREFIX}${code}`] = { from, to };
      }
    }
    return out;
  }

  /** Active + public custom field definitions of a scheme (contract v2 §2). */
  async fields(code: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    return publicFields(await this.loader.fields(manager, scheme)).map(
      (f: GcField) => ({
        code: f.code,
        label: f.label,
        type: f.type,
        list_code: f.list_code ?? null,
        help: f.help ?? null,
      }),
    );
  }

  private notFound(code: string, termId: number) {
    return new NotFoundException(`Concept ${code}/${termId} was not found`);
  }
}

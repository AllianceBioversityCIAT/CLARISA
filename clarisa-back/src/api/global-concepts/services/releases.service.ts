import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { GC_PUBLIC_STATUSES, GcConcept } from '../entities/gc-concept.entity';
import { GcHistory } from '../entities/gc-history.entity';
import { GcRelease } from '../entities/gc-release.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { schemeUri } from '../global-concepts.config';
import { presentConcepts } from '../utils/concept-presenter';
import { QualityIssue, checkQuality } from '../utils/quality-gate';
import { ConceptGraphLoader } from './concept-graph.loader';
import { ConceptsExportService } from './concepts-export.service';

export interface PublishReleaseInput {
  version: string;
  notes?: string | null;
}

export interface ReleaseSummary {
  version: string;
  release_uri: string;
  previous_version: string | null;
  released_at: Date;
  notes: string | null;
  license: string | null;
  concept_count: number;
  history_rows_stamped: number;
  warnings: QualityIssue[];
}

const SEMVER = /^\d+\.\d+\.\d+$/;

const isPublic = (c: GcConcept) => GC_PUBLIC_STATUSES.includes(c.status);

/** Negative, zero or positive, like a sort comparator. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/**
 * Releases freeze a scheme at a semantic version (design D4, D13). A release
 * is immutable: its snapshot, URI and predecessor are written once, and
 * `?version=` reads are served from that snapshot forever after.
 */
@Injectable()
export class ReleasesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly loader: ConceptGraphLoader,
    private readonly exporter: ConceptsExportService,
  ) {}

  /** The quality report a publish would run, without publishing anything. */
  async preview(code: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const { issues, concepts } = await this.gate(manager, scheme);
    return {
      scheme: scheme.code,
      publishable: !issues.some((i) => i.severity === 'error'),
      concept_count: concepts.filter(isPublic).length,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      issues,
    };
  }

  /**
   * Publishes a release in ONE transaction. The scheme row is locked first,
   * so two publishes of the same scheme queue instead of both reading the
   * same "latest release"; the reads that follow share one REPEATABLE READ
   * snapshot (V39), so an approval committed half-way cannot leave a concept
   * with new fields and old labels inside the release.
   */
  async publish(
    code: string,
    input: PublishReleaseInput,
    userEmail: string,
  ): Promise<ReleaseSummary> {
    const version = (input?.version ?? '').trim();
    if (!SEMVER.test(version)) {
      throw new BadRequestException(
        `Version "${version}" is not a semantic version (MAJOR.MINOR.PATCH)`,
      );
    }

    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const scheme = await manager
        .createQueryBuilder(GcScheme, 's')
        .setLock('pessimistic_write')
        .where('s.code = :code', { code: (code ?? '').toLowerCase() })
        .getOne();
      if (!scheme) {
        throw new NotFoundException(`Concept scheme "${code}" was not found`);
      }

      const existing = await manager.findOne(GcRelease, {
        where: { scheme_id: scheme.id, version },
        select: ['id'],
      });
      if (existing) {
        throw new ConflictException(
          `Release ${version} of "${scheme.code}" already exists`,
        );
      }
      // The latest by id, not by version: releases only move forward, and
      // the check below keeps id order and version order the same.
      const latest = await manager.findOne(GcRelease, {
        where: { scheme_id: scheme.id },
        order: { id: 'DESC' },
        select: ['id', 'version'],
      });
      if (latest && compareSemver(version, latest.version) <= 0) {
        throw new ConflictException(
          `Release ${version} must be greater than the latest release ${latest.version}`,
        );
      }

      const { issues, concepts, graph } = await this.gate(manager, scheme);
      const errors = issues.filter((i) => i.severity === 'error');
      if (errors.length) {
        throw new UnprocessableEntityException({
          message: `Release ${version} blocked by ${errors.length} quality error(s)`,
          issues: errors,
        });
      }

      const snapshot = presentConcepts(graph, isPublic);
      const releasedAt = new Date();
      const releaseUri = `${schemeUri(scheme)}/releases/${version}`;
      const saved = await manager.save(
        GcRelease,
        manager.create(GcRelease, {
          scheme_id: scheme.id,
          version,
          release_uri: releaseUri,
          previous_release_id: latest ? latest.id : null,
          released_at: releasedAt,
          notes: input.notes?.trim() || null,
          license: scheme.license,
          released_by_email: userEmail ?? null,
          snapshot: JSON.stringify(snapshot),
        }),
      );

      // Every change not yet shipped ships now (V31), so a request can be
      // traced to the release that published it. Only public concepts:
      // a draft's history has not been published by this release, and must
      // be stamped by the release that first publishes it.
      const publicIds = concepts.filter(isPublic).map((c) => Number(c.id));
      let stamped = 0;
      if (publicIds.length) {
        const result = await manager
          .createQueryBuilder()
          .update(GcHistory)
          .set({ release_id: saved.id })
          .where('release_id IS NULL')
          .andWhere('concept_id IN (:...ids)', { ids: publicIds })
          .execute();
        stamped = result?.affected ?? 0;
      }

      return {
        version,
        release_uri: releaseUri,
        previous_version: latest ? latest.version : null,
        released_at: releasedAt,
        notes: saved.notes ?? null,
        license: scheme.license,
        concept_count: snapshot.length,
        history_rows_stamped: stamped,
        warnings: issues.filter((i) => i.severity === 'warning'),
      };
    });
  }

  /**
   * The downloadable files of a release, rendered from its snapshot (D13).
   * Same bytes as `export(code, format, version)`.
   */
  async file(
    code: string,
    version: string,
    format: 'json' | 'csv' | 'skos' | 'jsonld',
  ) {
    return this.exporter.export(code, format, version);
  }

  /** Every concept of the scheme with its labels and relations, gated. */
  private async gate(manager: EntityManager, scheme: GcScheme) {
    const concepts = await manager.find(GcConcept, {
      where: { scheme_id: scheme.id },
      order: { preferred_label: 'ASC' },
    });
    const graph = await this.loader.load(manager, scheme, concepts);
    const issues = checkQuality(
      concepts,
      graph.labels,
      graph.relations,
      scheme.default_language || 'en',
    );
    return { issues, concepts, graph };
  }
}

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcHistory } from '../entities/gc-history.entity';
import { GcRelease } from '../entities/gc-release.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { QualityCode } from '../utils/quality-gate';
import { ConceptGraphLoader } from './concept-graph.loader';
import { ConceptsExportService } from './concepts-export.service';
import { ReleasesService, compareSemver } from './releases.service';

const scheme = {
  id: 1,
  code: 'concepts',
  uri_base: null,
  title: 'Concepts',
  default_language: 'en',
  license: 'CC BY 4.0',
} as GcScheme;

const concept = (
  id: number,
  label: string,
  overrides: Partial<GcConcept> = {},
) =>
  ({
    id,
    scheme_id: 1,
    term_id: 100 + id,
    preferred_label: label,
    language: 'en',
    definition: `Definition of ${label}`,
    status: GcConceptStatus.APPROVED,
    replaced_by_id: null,
    functions: [],
    phase_also: [],
    validated_by: [],
    ai_generated_fields: [],
    extra: {},
    ...overrides,
  }) as GcConcept;

describe('ReleasesService', () => {
  let service: ReleasesService;
  let manager: any;
  let dataSource: any;
  let loader: any;

  /** What the fake database holds. */
  let storedConcepts: GcConcept[];
  let storedReleases: Partial<GcRelease>[];
  let lockedScheme: GcScheme | null;
  let saved: any[];
  let historyUpdate: {
    set?: any;
    where: string[];
    params: any[];
    entity?: any;
  };
  let lockMode: string | null;

  beforeEach(() => {
    storedConcepts = [concept(1, 'Outcome'), concept(2, 'Output')];
    storedReleases = [];
    lockedScheme = scheme;
    saved = [];
    lockMode = null;
    historyUpdate = { where: [], params: [] };

    const schemeQb: any = {
      setLock: jest.fn((mode: string) => {
        lockMode = mode;
        return schemeQb;
      }),
      where: jest.fn(() => schemeQb),
      getOne: jest.fn(() => Promise.resolve(lockedScheme)),
    };
    const updateQb: any = {
      update: jest.fn((entity: any) => {
        historyUpdate.entity = entity;
        return updateQb;
      }),
      set: jest.fn((v: any) => {
        historyUpdate.set = v;
        return updateQb;
      }),
      where: jest.fn((w: string, p?: any) => {
        historyUpdate.where.push(w);
        historyUpdate.params.push(p);
        return updateQb;
      }),
      andWhere: jest.fn((w: string, p?: any) => {
        historyUpdate.where.push(w);
        historyUpdate.params.push(p);
        return updateQb;
      }),
      execute: jest.fn(() => Promise.resolve({ affected: 3 })),
    };

    manager = {
      createQueryBuilder: jest.fn((entity?: any) =>
        entity === GcScheme ? schemeQb : updateQb,
      ),
      find: jest.fn((entity: any) =>
        Promise.resolve(entity === GcConcept ? storedConcepts : []),
      ),
      findOne: jest.fn((entity: any, options: any) => {
        if (entity !== GcRelease) return Promise.resolve(null);
        const rows = storedReleases.filter(
          (r) => r.scheme_id === options.where.scheme_id,
        );
        if (options.where.version) {
          return Promise.resolve(
            rows.find((r) => r.version === options.where.version) ?? null,
          );
        }
        const sorted = [...rows].sort((a, b) => Number(b.id) - Number(a.id));
        return Promise.resolve(sorted[0] ?? null);
      }),
      create: jest.fn((_entity: any, plain: any) => ({ ...plain })),
      save: jest.fn((_entity: any, value: any) => {
        saved.push(value);
        return Promise.resolve({ id: 77, ...value });
      }),
    };
    dataSource = {
      manager,
      transaction: jest.fn((...args: any[]) => args[args.length - 1](manager)),
    };
    loader = {
      scheme: jest.fn(() => Promise.resolve(scheme)),
      load: jest.fn((_m: any, s: GcScheme, concepts: GcConcept[]) =>
        Promise.resolve({
          scheme: s,
          concepts,
          labels: [],
          relations: [],
          mappings: [],
          referenced: [],
        }),
      ),
    };
    service = new ReleasesService(
      dataSource,
      loader as ConceptGraphLoader,
      {} as ConceptsExportService,
    );
  });

  it('compares semantic versions numerically', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('0.9.9', '1.0.0')).toBeLessThan(0);
  });

  describe('preview', () => {
    it('reports publishable when there are no errors', async () => {
      const result = await service.preview('concepts');
      expect(result).toEqual(
        expect.objectContaining({
          publishable: true,
          errors: 0,
          concept_count: 2,
          issues: [],
        }),
      );
    });

    it('lists quality issues', async () => {
      storedConcepts = [concept(1, 'Outcome', { definition: null })];
      const result = await service.preview('concepts');
      expect(result.publishable).toBe(false);
      expect(result.issues[0].code).toBe(QualityCode.MISSING_DEFINITION);
    });
  });

  describe('publish', () => {
    it('publishes inside one REPEATABLE READ transaction with the scheme row locked', async () => {
      const result = await service.publish(
        'concepts',
        { version: '1.0.0', notes: ' First ' },
        'a@cgiar.org',
      );

      expect(dataSource.transaction).toHaveBeenCalledWith(
        'REPEATABLE READ',
        expect.any(Function),
      );
      expect(lockMode).toBe('pessimistic_write');
      expect(saved).toHaveLength(1);
      const release = saved[0];
      expect(release).toEqual(
        expect.objectContaining({
          scheme_id: 1,
          version: '1.0.0',
          release_uri:
            'https://api.clarisa.cgiar.org/concepts/concepts/releases/1.0.0',
          previous_release_id: null,
          notes: 'First',
          license: 'CC BY 4.0',
          released_by_email: 'a@cgiar.org',
        }),
      );
      const snapshot = JSON.parse(release.snapshot);
      expect(snapshot.map((c: any) => c.term_id)).toEqual([101, 102]);
      expect(snapshot[0].term_uri).toBe(
        'https://api.clarisa.cgiar.org/concepts/concepts/101',
      );
      expect(result).toEqual(
        expect.objectContaining({
          version: '1.0.0',
          previous_version: null,
          concept_count: 2,
          history_rows_stamped: 3,
        }),
      );
    });

    it('links the previous release', async () => {
      storedReleases = [
        { id: 3, scheme_id: 1, version: '1.0.0' },
        { id: 4, scheme_id: 1, version: '1.1.0' },
      ];
      const result = await service.publish(
        'concepts',
        { version: '1.2.0' },
        'a@cgiar.org',
      );
      expect(saved[0].previous_release_id).toBe(4);
      expect(result.previous_version).toBe('1.1.0');
    });

    it('keeps drafts out of the snapshot and out of the history stamp', async () => {
      storedConcepts = [
        concept(1, 'Outcome'),
        concept(2, 'Draft thing', {
          status: GcConceptStatus.DRAFT,
          definition: null,
        }),
      ];
      await service.publish('concepts', { version: '1.0.0' }, 'a@cgiar.org');
      const snapshot = JSON.parse(saved[0].snapshot);
      expect(snapshot.map((c: any) => c.term_id)).toEqual([101]);
      expect(historyUpdate.params).toContainEqual({ ids: [1] });
    });

    it('stamps release_id on unreleased history rows of the published concepts', async () => {
      await service.publish('concepts', { version: '1.0.0' }, 'a@cgiar.org');
      expect(historyUpdate.entity).toBe(GcHistory);
      expect(historyUpdate.set).toEqual({ release_id: 77 });
      expect(historyUpdate.where).toEqual([
        'release_id IS NULL',
        'concept_id IN (:...ids)',
      ]);
      expect(historyUpdate.params[1]).toEqual({ ids: [1, 2] });
    });

    it('rejects a version that is not MAJOR.MINOR.PATCH before opening a transaction', async () => {
      await expect(
        service.publish('concepts', { version: 'v1.0' }, 'a@cgiar.org'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown scheme', async () => {
      lockedScheme = null;
      await expect(
        service.publish('nope', { version: '1.0.0' }, 'a@cgiar.org'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses a version that already exists with 409', async () => {
      storedReleases = [{ id: 3, scheme_id: 1, version: '1.0.0' }];
      await expect(
        service.publish('concepts', { version: '1.0.0' }, 'a@cgiar.org'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saved).toHaveLength(0);
    });

    it('refuses a version lower than the latest release with 409', async () => {
      storedReleases = [{ id: 3, scheme_id: 1, version: '1.2.0' }];
      await expect(
        service.publish('concepts', { version: '1.1.9' }, 'a@cgiar.org'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saved).toHaveLength(0);
    });

    it('refuses with 422 and lists the errors when the quality gate fails', async () => {
      storedConcepts = [concept(1, 'Outcome'), concept(2, 'outcome')];
      const error = await service
        .publish('concepts', { version: '1.0.0' }, 'a@cgiar.org')
        .catch((e) => e);
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      const body = error.getResponse();
      expect(body.issues.map((i: any) => i.code)).toEqual([
        QualityCode.DUPLICATE_PREF_LABEL,
        QualityCode.DUPLICATE_PREF_LABEL,
      ]);
      expect(saved).toHaveLength(0);
      expect(historyUpdate.set).toBeUndefined();
    });

    it('publishes despite warnings and returns them', async () => {
      storedConcepts = [
        concept(1, 'Outcome'),
        concept(2, 'Old', { status: GcConceptStatus.DEPRECATED }),
      ];
      const result = await service.publish(
        'concepts',
        { version: '1.0.0' },
        'a@cgiar.org',
      );
      expect(result.warnings.map((w) => w.code)).toEqual([
        QualityCode.DEPRECATED_WITHOUT_REPLACEMENT,
      ]);
      expect(saved).toHaveLength(1);
    });
  });
});

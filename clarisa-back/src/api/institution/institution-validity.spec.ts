import { Test, TestingModule } from '@nestjs/testing';
import {
  ArgumentMetadata,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';
import { InstitutionRepository } from './repositories/institution.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ValidityStatusOptions } from '../../shared/entities/enums/validity-status-options';
import {
  InstitutionLineage,
  InstitutionLineageRelationType,
} from './entities/institution-lineage.entity';
import { UpdateInstitutionLifecycleDto } from './dto/update-institution-lifecycle.dto';

/**
 * Contract tests for the institution validity period and lineage.
 *
 * The point of this file is regression, not coverage: the whole change is only
 * safe as long as the default response stays byte-identical for a caller that
 * asks for nothing, and as long as lifecycle fields cannot travel through the
 * unauthenticated bulk-edit endpoint.
 */
describe('Institution validity and lineage', () => {
  let service: InstitutionService;

  const repositoryMock: any = {
    findInstitutions: jest.fn().mockResolvedValue([]),
    findAllInstitutionsSimple: jest.fn().mockResolvedValue([]),
    findInstitutionById: jest.fn().mockResolvedValue(null),
    findInstitutionSimpleById: jest.fn().mockResolvedValue(null),
    updateLifecycle: jest.fn().mockResolvedValue({ code: 221 }),
    save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionService,
        { provide: InstitutionRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get<InstitutionService>(InstitutionService);
  });

  describe('status query parameter', () => {
    it('treats `?status=` with no value as an absent filter, not as an error', async () => {
      // Several HTTP clients serialise an undefined query parameter as an
      // empty string. That is an absent filter, and it must answer with the
      // full list rather than a 400.
      const controller = new InstitutionController(service);
      await controller.findAll(
        FindAllOptions.SHOW_ONLY_ACTIVE,
        undefined,
        '' as ValidityStatusOptions,
      );

      expect(repositoryMock.findInstitutions).toHaveBeenCalledWith(
        FindAllOptions.SHOW_ONLY_ACTIVE,
        undefined,
        undefined,
        ValidityStatusOptions.SHOW_ALL,
      );
    });

    it('defaults to showing every institution, so today callers see no change', async () => {
      await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);

      expect(repositoryMock.findInstitutions).toHaveBeenCalledWith(
        FindAllOptions.SHOW_ONLY_ACTIVE,
        undefined,
        undefined,
        ValidityStatusOptions.SHOW_ALL,
      );
    });

    it.each([
      ValidityStatusOptions.SHOW_ALL,
      ValidityStatusOptions.SHOW_ONLY_ACTIVE,
      ValidityStatusOptions.SHOW_ONLY_ENDED,
    ])('forwards the %s filter to the repository', async (status) => {
      await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE, undefined, status);

      expect(repositoryMock.findInstitutions).toHaveBeenCalledWith(
        FindAllOptions.SHOW_ONLY_ACTIVE,
        undefined,
        undefined,
        status,
      );
    });

    it('rejects an unknown value instead of silently ignoring it', async () => {
      // A consumer that misspells the filter must not get a full list while
      // believing it was filtered.
      await expect(
        service.findAll(
          FindAllOptions.SHOW_ONLY_ACTIVE,
          undefined,
          'activo' as ValidityStatusOptions,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repositoryMock.findInstitutions).not.toHaveBeenCalled();
    });

    it('still rejects an unknown show option', async () => {
      await expect(service.findAll('nope' as FindAllOptions)).rejects.toThrow();
    });
  });

  describe('lifecycle fields cannot travel through the bulk-edit endpoint', () => {
    it.each([
      'start_date',
      'end_date',
      'startDate',
      'endDate',
      'replacedBy',
      'replaces',
      'outgoing_lineages',
      'incoming_lineages',
    ])('strips %s from the update payload', async (field) => {
      await service.update([
        { id: 221, name: 'X', [field]: 'anything' },
      ] as any);

      const [saved] = repositoryMock.save.mock.calls[0];
      expect(saved[0]).not.toHaveProperty(field);
    });

    it.each([
      ['array payload', (body: any) => [body]],
      ['single-object payload', (body: any) => body],
    ])(
      'cannot be bypassed with a `__proto__` key (%s)',
      async (_label, wrap) => {
        // `JSON.parse` hands `__proto__` over as a plain own property, so it
        // survives until something copies the object with `[[Set]]`. At this
        // compile target `{ ...dto }` is emitted as `Object.assign`, which does
        // exactly that: the key became the *prototype* of the copy, `delete`
        // could not reach it, and TypeORM — which resolves columns through the
        // prototype chain — wrote `end_date` for an unauthenticated caller.
        const body = JSON.parse(
          '{"id":221,"name":"X","__proto__":{"end_date":"2004-04-04","start_date":"1990-01-01"}}',
        );

        await service.update(wrap(body));

        const [saved] = repositoryMock.save.mock.calls[0];
        const sanitised = Array.isArray(saved) ? saved[0] : saved;
        expect(sanitised.end_date).toBeUndefined();
        expect(sanitised.start_date).toBeUndefined();
        expect(Object.getPrototypeOf(sanitised)).toBe(Object.prototype);
      },
    );

    it('does not let the global prototype be polluted either', async () => {
      await service.update(
        JSON.parse(
          '{"id":221,"name":"X","constructor":{"prototype":{"end_date":"2008-08-08"}}}',
        ),
      );

      expect(({} as any).end_date).toBeUndefined();
      const [saved] = repositoryMock.save.mock.calls[0];
      expect(saved.end_date).toBeUndefined();
    });

    it('keeps the legitimate fields untouched', async () => {
      await service.update([
        { id: 221, name: 'CGIAR System Organization', acronym: 'SMO' },
      ] as any);

      const [saved] = repositoryMock.save.mock.calls[0];
      expect(saved[0]).toEqual({
        id: 221,
        name: 'CGIAR System Organization',
        acronym: 'SMO',
      });
    });

    it('strips the lifecycle fields from a single-object payload too', async () => {
      // The endpoint has no validation pipe, so a caller can send one object
      // instead of an array and `save()` accepts it. That door has to be
      // sanitised as well, and it has to keep answering with a single entity.
      await service.update({
        id: 221,
        name: 'X',
        end_date: '2025-12-31',
      } as any);

      const [saved] = repositoryMock.save.mock.calls[0];
      expect(Array.isArray(saved)).toBe(false);
      expect(saved).toEqual({ id: 221, name: 'X' });
    });

    it('hands an empty or missing payload to the repository untouched', async () => {
      // Deciding what an empty body means is TypeORM's job and always was:
      // turning `undefined` into `[]` here would silently change the answer a
      // caller gets today without having changed anything on its side.
      await service.update([]);
      expect(repositoryMock.save).toHaveBeenCalledWith([]);

      await service.update(undefined as any);
      expect(repositoryMock.save).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('lifecycle management', () => {
    it('passes the acting user through so the change is auditable', async () => {
      const dto = {
        endDate: '2025-12-31',
        replacedByInstitutionId: 9876,
        relationType: InstitutionLineageRelationType.RENAME,
        note: 'Acronym changed from SMO to SO. Same organisation, renamed.',
      };

      await service.updateLifecycle(221, dto, 4372);

      expect(repositoryMock.updateLifecycle).toHaveBeenCalledWith(
        221,
        dto,
        4372,
      );
    });
  });

  describe('relation type vocabulary', () => {
    it('is frozen to the one already in production for global units', () => {
      // Diverging here would leave two sibling lineage tables speaking
      // different dialects, and PRMS would launder any unknown value into
      // 'NEW' anyway. A rename is stored as 'NEW' on purpose.
      expect(Object.values(InstitutionLineageRelationType)).toEqual([
        'MERGE',
        'SPLIT',
        'SUCCESSOR',
        'NEW',
      ]);
      expect(InstitutionLineageRelationType.RENAME).toBe('NEW');
    });
  });
});

/**
 * The repository is where the real invariants live: the service only forwards.
 * These tests drive the actual branch logic of `updateLifecycle` with the
 * persistence layer mocked, so a regression in a guard fails here instead of
 * being discovered by PRMS.
 */
describe('InstitutionRepository lifecycle invariants', () => {
  type Harness = {
    repository: InstitutionRepository;
    entityManager: {
      query: jest.Mock;
      save: jest.Mock;
      find: jest.Mock;
      delete: jest.Mock;
    };
    manager: { count: jest.Mock; find: jest.Mock; transaction: jest.Mock };
    findOne: jest.SpyInstance;
  };

  /** the UPDATE that carries the validity period, i.e. not the successor bump */
  const lifecycleUpdate = (entityManager: { query: jest.Mock }) =>
    entityManager.query.mock.calls.find(([sql]) =>
      String(sql).includes('updated_by'),
    );

  function buildHarness(rows: Record<number, unknown> = {}): Harness {
    const entityManager = {
      query: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((callback: (em: unknown) => unknown) =>
        Promise.resolve(callback(entityManager)),
      ),
    };
    const dataSource = { createEntityManager: () => manager } as never;
    const repository = new InstitutionRepository(dataSource, {} as never);

    const findOne = jest
      .spyOn(repository, 'findOne')
      .mockImplementation((options: any) =>
        Promise.resolve((rows[options?.where?.id] as never) ?? null),
      );
    jest
      .spyOn(repository, 'findInstitutionById')
      .mockResolvedValue({ code: 221 } as never);

    return { repository, entityManager, manager, findOne };
  }

  const SMO = { id: 221, end_date: null };
  const SO = { id: 9876, end_date: null };
  const RETIRED = { id: 45, end_date: '2024-06-30' };

  describe('guards', () => {
    it('rejects an institution that does not exist', async () => {
      const { repository, manager } = buildHarness({});

      await expect(repository.updateLifecycle(9, {}, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects an institution replacing itself', async () => {
      const { repository, manager } = buildHarness({ 221: SMO });

      await expect(
        repository.updateLifecycle(221, { replacedByInstitutionId: 221 }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a self-replacement whose id arrived as a string', async () => {
      // A form-encoded body, or any client that quotes the number, delivers
      // '221' rather than 221. A strict comparison lets it through and the
      // institution ends up pointing at itself: a loop a consumer resolving a
      // rename chain never exits.
      const { repository, manager } = buildHarness({ 221: SMO });

      await expect(
        repository.updateLifecycle(
          221,
          { replacedByInstitutionId: '221' as unknown as number },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a successor that does not exist', async () => {
      const { repository, manager } = buildHarness({ 221: SMO });

      await expect(
        repository.updateLifecycle(
          221,
          { endDate: '2025-12-31', replacedByInstitutionId: 4242 },
          1,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a successor that is itself retired', async () => {
      const { repository, manager } = buildHarness({ 221: SMO, 45: RETIRED });

      await expect(
        repository.updateLifecycle(
          221,
          { endDate: '2025-12-31', replacedByInstitutionId: 45 },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a second, different successor for the same institution', async () => {
      const { repository, manager } = buildHarness({ 221: SMO, 9876: SO });
      manager.find.mockResolvedValue([
        { from_institution_id: 221, to_institution_id: 4242 },
      ]);

      await expect(
        repository.updateLifecycle(
          221,
          { endDate: '2025-12-31', replacedByInstitutionId: 9876 },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a successor that is logically deleted', async () => {
      // `is_active` is the platform's soft delete and this endpoint never
      // touches it, but the default `GET /api/institutions` hides those rows:
      // pointing `replacedBy` at one names an institution the consumer does
      // not have.
      const { repository, manager } = buildHarness({
        221: SMO,
        9876: { id: 9876, end_date: null, auditableFields: { is_active: 0 } },
      });

      await expect(
        repository.updateLifecycle(
          221,
          { endDate: '2025-12-31', replacedByInstitutionId: 9876 },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a successor recorded without any end date', async () => {
      // `validityStatus: 'active'` next to a non-empty `replacedBy` is a
      // contradiction no consumer has a rule for: PRMS, MEL, MARLO and STAR
      // either keep offering an institution that declares its own replacement
      // or hide one that is still valid.
      const { repository, manager } = buildHarness({ 221: SMO, 9876: SO });

      await expect(
        repository.updateLifecycle(221, { replacedByInstitutionId: 9876 }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
      expect(manager.count).not.toHaveBeenCalled();
    });

    it('rejects a successor sent together with an explicit revive', async () => {
      const { repository, manager } = buildHarness({ 221: SMO, 9876: SO });

      await expect(
        repository.updateLifecycle(
          221,
          { endDate: null, replacedByInstitutionId: 9876 },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('accepts a successor for an institution retired in an earlier call', async () => {
      // The end date does not have to travel in this request: one already
      // stored is just as good, and retiring first and linking later is a
      // legitimate two-step flow.
      const { repository, entityManager, manager } = buildHarness({
        45: RETIRED,
        9876: SO,
      });

      await repository.updateLifecycle(
        45,
        { replacedByInstitutionId: 9876 },
        1,
      );

      expect(manager.transaction).toHaveBeenCalledTimes(1);
      expect(entityManager.save).toHaveBeenCalledTimes(1);
      // and the edge still carries a date: the stored one.
      expect(entityManager.save.mock.calls[0][1].change_date).toBe(
        '2024-06-30',
      );
    });

    it('does not look for an existing successor when none was asked for', async () => {
      const { repository, manager } = buildHarness({ 221: SMO });

      await repository.updateLifecycle(221, { endDate: '2025-12-31' }, 1);

      expect(manager.find).not.toHaveBeenCalled();
    });

    it('accepts the successor already recorded and rewrites that same edge', async () => {
      // What the admin panel sends verbatim when its dialog is reopened on a
      // row that is already linked. Treating it as a conflict would leave the
      // panel unable to save any institution it had already retired, and would
      // make the relation type, the change date and the note uncorrectable.
      const existing = {
        id: 2014,
        from_institution_id: 221,
        to_institution_id: 9876,
        relation_type: InstitutionLineageRelationType.RENAME,
        change_date: '2025-12-31',
        note: 'first note',
        created_by: 4372,
      };
      const { repository, entityManager, manager } = buildHarness({
        221: SMO,
        9876: SO,
      });
      manager.find.mockResolvedValue([existing]);

      await repository.updateLifecycle(
        221,
        {
          endDate: '2025-12-31',
          replacedByInstitutionId: 9876,
          relationType: InstitutionLineageRelationType.MERGE,
          changeDate: '2025-06-30',
        },
        99,
      );

      expect(manager.transaction).toHaveBeenCalledTimes(1);
      const [, saved] = entityManager.save.mock.calls[0];
      // the same row, not a second edge
      expect(saved.id).toBe(2014);
      expect(saved).toMatchObject({
        to_institution_id: 9876,
        relation_type: InstitutionLineageRelationType.MERGE,
        change_date: '2025-06-30',
        note: 'first note',
        created_by: 4372,
      });
      expect(entityManager.delete).not.toHaveBeenCalled();
    });

    it('removes the succession on an explicit null without reviving', async () => {
      // Undoing a wrong successor through a revive would rewrite the end date
      // and republish the institution as valid in between.
      const { repository, entityManager, manager } = buildHarness({ 221: SMO });
      entityManager.find.mockResolvedValue([
        { from_institution_id: 221, to_institution_id: 9876 },
      ]);

      await repository.updateLifecycle(
        221,
        { replacedByInstitutionId: null },
        1,
      );

      expect(entityManager.delete).toHaveBeenCalledWith(InstitutionLineage, {
        from_institution_id: 221,
      });
      expect(entityManager.save).not.toHaveBeenCalled();
      // end_date is left exactly as it was
      const [sql] = lifecycleUpdate(entityManager);
      expect(String(sql)).not.toContain('end_date');
      // and the successor that lost its predecessor is bumped for `?from=`
      const bumped = entityManager.query.mock.calls
        .filter(([statement]) =>
          String(statement).includes('updated_at = CURRENT_TIMESTAMP'),
        )
        .map(([, params]) => params[params.length - 1]);
      expect(bumped).toContain(9876);
      expect(manager.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('writes', () => {
    it('writes the date and the edge inside a single transaction', async () => {
      const { repository, entityManager, manager } = buildHarness({
        221: SMO,
        9876: SO,
      });

      await repository.updateLifecycle(
        221,
        { endDate: '2025-12-31', replacedByInstitutionId: 9876 },
        4372,
      );

      expect(manager.transaction).toHaveBeenCalledTimes(1);
      const [sql, params] = lifecycleUpdate(entityManager);
      expect(sql).toContain('end_date = ?');
      expect(params).toEqual([4372, '2025-12-31', 221]);
      expect(entityManager.save).toHaveBeenCalledTimes(1);
    });

    it('bumps updated_at on both ends so ?from= sync sees them', async () => {
      // The successor's own record changes too — `replaces`,
      // `previousAcronyms` and `previousNames` are derived from the new edge —
      // so a sync that only picks up the retired one leaves consumers holding
      // a stale successor.
      const { repository, entityManager } = buildHarness({
        221: SMO,
        9876: SO,
      });

      await repository.updateLifecycle(
        221,
        { endDate: '2025-12-31', replacedByInstitutionId: 9876 },
        4372,
      );

      const bumped = entityManager.query.mock.calls
        .filter(([sql]) =>
          String(sql).includes('updated_at = CURRENT_TIMESTAMP'),
        )
        .map(([, params]) => params[params.length - 1]);
      expect(bumped).toEqual(expect.arrayContaining([221, 9876]));
    });

    it('defaults the relation type to a rename and the change date to the end date', async () => {
      const { repository, entityManager } = buildHarness({
        221: SMO,
        9876: SO,
      });

      await repository.updateLifecycle(
        221,
        { endDate: '2025-12-31', replacedByInstitutionId: 9876 },
        4372,
      );

      const [, edge] = entityManager.save.mock.calls[0];
      expect(edge).toMatchObject({
        from_institution_id: 221,
        to_institution_id: 9876,
        relation_type: InstitutionLineageRelationType.RENAME,
        change_date: '2025-12-31',
        created_by: 4372,
      });
      expect(entityManager.save.mock.calls[0][0]).toBe(InstitutionLineage);
    });

    it('keeps an explicit changeDate distinct from the end date', async () => {
      const { repository, entityManager } = buildHarness({
        221: SMO,
        9876: SO,
      });

      await repository.updateLifecycle(
        221,
        {
          endDate: '2025-12-31',
          changeDate: '2024-01-15',
          replacedByInstitutionId: 9876,
        },
        4372,
      );

      expect(entityManager.save.mock.calls[0][1].change_date).toBe(
        '2024-01-15',
      );
    });

    it('distinguishes an omitted date from an explicit null that revives', async () => {
      const omitted = buildHarness({ 221: SMO });
      await omitted.repository.updateLifecycle(221, { note: 'typo fix' }, 1);
      const [omittedSql] = lifecycleUpdate(omitted.entityManager);
      expect(omittedSql).not.toContain('end_date');
      expect(omittedSql).not.toContain('start_date');

      const revived = buildHarness({ 221: SMO });
      await revived.repository.updateLifecycle(221, { endDate: null }, 1);
      const [revivedSql, revivedParams] = lifecycleUpdate(
        revived.entityManager,
      );
      expect(revivedSql).toContain('end_date = ?');
      expect(revivedParams).toEqual([1, null, 221]);
    });

    it('drops the succession edges when the institution is revived', async () => {
      // Reviving is the undo of retiring. A live institution that still
      // declares who replaced it is the same contradiction guarded against in
      // the write path, and the surviving edge would block it from ever being
      // retired towards a different successor.
      const { repository, entityManager } = buildHarness({ 221: SMO });
      entityManager.find.mockResolvedValue([
        { to_institution_id: 9876 },
        { to_institution_id: 45 },
      ]);

      await repository.updateLifecycle(221, { endDate: null }, 4372);

      expect(entityManager.delete).toHaveBeenCalledWith(InstitutionLineage, {
        from_institution_id: 221,
      });

      // The successors' own `replaces`, `previousAcronyms` and `previousNames`
      // just changed, so `?from=` has to see them as well.
      const [bumpSql, bumpParams] = entityManager.query.mock.calls.find(
        ([sql]) => !String(sql).includes('updated_by'),
      );
      expect(bumpSql).toContain('updated_at = CURRENT_TIMESTAMP');
      expect(bumpSql).toContain('id in (?, ?)');
      expect(bumpParams).toEqual([9876, 45]);
    });

    it('does not touch the lineage table when reviving something with no successor', async () => {
      const { repository, entityManager } = buildHarness({ 221: SMO });

      await repository.updateLifecycle(221, { endDate: null }, 4372);

      expect(entityManager.delete).not.toHaveBeenCalled();
      expect(
        entityManager.query.mock.calls.filter(
          ([sql]) => !String(sql).includes('updated_by'),
        ),
      ).toHaveLength(0);
    });

    it('leaves the lineage alone when the end date was merely omitted', async () => {
      const { repository, entityManager } = buildHarness({ 45: RETIRED });

      await repository.updateLifecycle(45, { note: 'typo fix' }, 4372);

      expect(entityManager.find).not.toHaveBeenCalled();
      expect(entityManager.delete).not.toHaveBeenCalled();
    });

    it('survives an unauthenticated-looking call with no user id', async () => {
      // `request.user?.userId` is optional chaining: if the guard chain ever
      // changes shape, undefined must become NULL and not blow up mysql2 with
      // an undefined bind parameter.
      const { repository, entityManager } = buildHarness({ 221: SMO });

      await repository.updateLifecycle(
        221,
        { endDate: '2025-12-31' },
        undefined,
      );

      const [, params] = lifecycleUpdate(entityManager);
      expect(params[0]).toBeNull();
      expect(params).not.toContain(undefined);
    });

    it('never writes lifecycle rows when a guard rejected', async () => {
      const { repository, entityManager } = buildHarness({
        221: SMO,
        45: RETIRED,
      });

      await expect(
        repository.updateLifecycle(
          221,
          { endDate: '2025-12-31', replacedByInstitutionId: 45 },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(entityManager.query).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });
  });

  describe('list query stays additive', () => {
    const capture = async (
      ...args: Parameters<InstitutionRepository['findInstitutions']>
    ) => {
      const { repository } = buildHarness();
      const query = jest.spyOn(repository, 'query').mockResolvedValue([]);
      await repository.findInstitutions(...args);
      return String(query.mock.calls[0][0]);
    };

    it('adds no validity predicate when the caller sends nothing', async () => {
      const sql = await capture(FindAllOptions.SHOW_ALL);

      // Only the WHERE clause matters here: `i.end_date is null` also appears
      // in the select, inside the CASE that derives `validityStatus`.
      const whereClause = sql.slice(sql.lastIndexOf('where i.is_active'));
      expect(whereClause).not.toContain('and (i.end_date is null');
      expect(whereClause).not.toContain('and i.end_date is not null');
    });

    it.each([
      [
        ValidityStatusOptions.SHOW_ONLY_ACTIVE,
        'and (i.end_date is null or i.end_date > curdate())',
      ],
      [
        ValidityStatusOptions.SHOW_ONLY_ENDED,
        'and i.end_date is not null and i.end_date <= curdate()',
      ],
    ])('adds exactly one predicate for %s', async (status, predicate) => {
      const sql = await capture(
        FindAllOptions.SHOW_ALL,
        undefined,
        undefined,
        status,
      );

      expect(sql).toContain(predicate);
    });

    it('treats an end date still in the future as usable', async () => {
      // The filter answers "can I still use it today", not "does it carry a
      // date". Announcing a retirement in advance must not switch the
      // institution off for every consumer the same day it is announced.
      const sql = await capture(
        FindAllOptions.SHOW_ALL,
        undefined,
        undefined,
        ValidityStatusOptions.SHOW_ONLY_ACTIVE,
      );

      expect(sql).toContain('i.end_date > curdate()');
      expect(sql).toContain("when i.end_date > curdate() then 'ending'");
    });

    it('coalesces every lineage array so none can be published as null', async () => {
      // json_arrayagg returns NULL rather than [] when it matches no rows, and
      // a consumer doing `institution.replacedBy.length` would crash on it.
      const sql = await capture(FindAllOptions.SHOW_ALL);

      for (const field of [
        'replacedBy',
        '`replaces`',
        'previousAcronyms',
        'previousNames',
      ]) {
        expect(sql).toMatch(
          new RegExp(`json_array\\(\\)\\)\\s*${field.replace(/[`]/g, '`')}`),
        );
      }
      expect(sql.match(/coalesce\(/g)).toHaveLength(4);
    });
  });
});

/**
 * The payload contract of the guarded endpoint. The pipe is declared on the
 * handler itself (there is no global one), so it is exercised here with the
 * same options and the same metadata Nest passes for `@Body()`.
 */
describe('UpdateInstitutionLifecycleDto validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateInstitutionLifecycleDto,
    data: '',
  };
  const run = (body: unknown) => pipe.transform(body, metadata);

  it('accepts what the panel sends', async () => {
    await expect(
      run({
        startDate: '1971-01-01',
        endDate: '2025-12-31',
        replacedByInstitutionId: 9876,
        relationType: 'NEW',
        changeDate: '2025-12-31',
        note: 'Acronym changed from SMO to SO.',
      }),
    ).resolves.toMatchObject({ endDate: '2025-12-31' });
  });

  it('lets an explicit null through, since that is how an institution is revived', async () => {
    await expect(run({ endDate: null })).resolves.toEqual({ endDate: null });
  });

  it.each([
    ['2025-12-31T00:00:00.000Z'],
    ['2025-12-31 00:00:00'],
    ['31/12/2025'],
    ['2025-02-30'],
    ['not-a-date'],
  ])('rejects %s instead of letting mysql answer with a 500', async (value) => {
    // These columns are DATE. Anything with a time part, or a day that does not
    // exist, reaches the engine and comes back as a 500 quoting column names.
    await expect(run({ endDate: value })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses unknown keys so no other column can be reached from here', async () => {
    await expect(run({ is_active: false })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

/**
 * The lifecycle endpoint's only authorisation is `PermissionGuard`, so what the
 * guard actually compares is part of this contract: retiring an institution is
 * a write the whole CGIAR reads, and it must not be reachable by a user who
 * merely holds some other permission.
 *
 * `originalUrl` includes the query string in Express and the permission check
 * is a substring match, so a caller could previously append their own
 * permission to the URL and have it authorise any route.
 */
describe('PermissionGuard on the lifecycle endpoint', () => {
  const buildGuard = (permissions: string[]) => {
    const reflector: any = { get: () => undefined };
    const moduleRef: any = {
      get: () => ({
        findOneByEmail: async () => ({
          id: 4372,
          email: 'someone@cgiar.org',
          permissions,
        }),
      }),
    };
    return new PermissionGuard(reflector, moduleRef);
  };

  const contextFor = (originalUrl: string): any => ({
    getClass: () => class Anything {},
    getHandler: () => function handler() {},
    switchToHttp: () => ({
      getRequest: () => ({ user: { email: 'someone@cgiar.org' }, originalUrl }),
    }),
  });

  it('denies the lifecycle route to a user holding an unrelated permission', async () => {
    const guard = buildGuard(['/api/countries']);

    await expect(
      guard.canActivate(contextFor('/api/institutions/221/lifecycle')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cannot be authorised by hanging the permission off the query string', async () => {
    const guard = buildGuard(['/api/countries']);

    await expect(
      guard.canActivate(
        contextFor('/api/institutions/221/lifecycle?x=/api/countries'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('still authorises a legitimate route that carries query parameters', async () => {
    // The fix only removes characters from what is compared, so nothing that
    // is permitted today may stop being permitted.
    const guard = buildGuard(['/api/countries']);

    await expect(
      guard.canActivate(contextFor('/api/countries?show=all')),
    ).resolves.toBe(true);
  });
});

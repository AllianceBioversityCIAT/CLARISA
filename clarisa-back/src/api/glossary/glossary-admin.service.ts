import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Glossary } from './entities/glossary.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { User } from '../user/entities/user.entity';
import { GlossaryRepository } from './repositories/glossary.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UserData } from '../../shared/interfaces/user-data';
import {
  CreateGlossaryTermDto,
  GlossaryAdminDto,
  GlossaryAuditUserDto,
  GlossaryBulkConflictPolicy,
  GlossaryBulkDto,
  GlossaryBulkResultDto,
  GlossaryBulkRowAction,
  GlossaryBulkRowResultDto,
  GlossaryTermPortfolioDto,
  REFERENCE_DATE_PATTERN,
  SplitGlossaryTermDto,
  UpdateGlossaryTermDto,
} from './dto/glossary-admin.dto';

/**
 * Write side of the glossary, used exclusively by the CLARISA admin panel.
 *
 * The public read endpoints (`GET api/glossary`) keep their contract untouched:
 * this service never renames columns nor changes what consumers already read.
 * Everything here is additive.
 */
@Injectable()
export class GlossaryAdminService {
  constructor(
    private readonly _glossaryRepository: GlossaryRepository,
    private readonly _dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------- helpers

  /** Collapses whitespace so `"  Impact   Area "` and `"Impact Area"` match. */
  private normalizeTerm(term: string): string {
    return (term ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Case-insensitive key used to detect duplicates. */
  private termKey(term: string): string {
    return this.normalizeTerm(term).toLowerCase();
  }

  /**
   * A reference date as the calendar day it is, `YYYY-MM-DD`.
   *
   * TypeORM models a `date` column as a string, so the day is simply sliced —
   * never parsed into a `Date` and formatted back. That round trip is what
   * shifts the day: `new Date('2026-09-01')` is UTC midnight, and printing it
   * west of Greenwich (Cali included) gives 31 August.
   */
  private toIsoDay(value: string | null | undefined): string | null {
    return value ? value.slice(0, 10) : null;
  }

  /**
   * Normalizes an incoming provenance value: trimmed text, or `null` when the
   * caller sent it empty. Storing `''` would make an empty source render as a
   * blank "Source:" line on the public page.
   */
  private toNullableText(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed === '' ? null : trimmed;
  }

  /**
   * Copies the provenance a caller actually sent onto the record.
   *
   * Each field is only touched when the key is present, so a partial update
   * never clears one it did not mention. An empty string is sent on purpose
   * and does clear the value.
   */
  private applyProvenance(
    glossary: Glossary,
    dto: Pick<
      UpdateGlossaryTermDto,
      'source' | 'source_url' | 'reference_date'
    >,
  ): void {
    if (dto.source !== undefined) {
      glossary.source = this.toNullableText(dto.source);
    }
    if (dto.source_url !== undefined) {
      glossary.sourceUrl = this.toNullableText(dto.source_url);
    }
    if (dto.reference_date !== undefined) {
      glossary.referenceDate = this.toNullableText(dto.reference_date);
    }
  }

  private toPortfolioDto(portfolio: Portfolio): GlossaryTermPortfolioDto {
    return {
      id: Number(portfolio.id),
      name: portfolio.name,
      acronym: portfolio.acronym,
    };
  }

  private toAdminDto(
    glossary: Glossary,
    users: Map<number, GlossaryAuditUserDto> = new Map(),
  ): GlossaryAdminDto {
    const portfolios = (glossary.glossary_portfolio_array ?? [])
      .filter((gp) => gp.auditableFields?.is_active && gp.portfolio_object)
      .map((gp) => this.toPortfolioDto(gp.portfolio_object));

    return {
      id: Number(glossary.id),
      group_id: this.groupOf(glossary),
      term: glossary.title,
      definition: glossary.definition,
      source: glossary.source ?? null,
      source_url: glossary.sourceUrl ?? null,
      reference_date: this.toIsoDay(glossary.referenceDate),
      is_active: !!glossary.auditableFields?.is_active,
      show_in_dashboard: !!glossary.show_in_dashboard,
      application_name: glossary.applicationName,
      portfolios,
      last_modified_at: this.lastModifiedAt(glossary),
      last_modified_by: users.get(this.lastModifiedById(glossary)) ?? null,
    };
  }

  /**
   * The user behind the last change: `updated_by`, or the creator when nobody
   * edited the record since. A row written straight into the database may carry
   * neither, and then there is nobody to name.
   */
  private lastModifiedById(glossary: Glossary): number {
    return Number(
      glossary.auditableFields?.updated_by ??
        glossary.auditableFields?.created_by,
    );
  }

  private lastModifiedAt(glossary: Glossary): string | null {
    const at =
      glossary.auditableFields?.updated_at ??
      glossary.auditableFields?.created_at;
    return at ? new Date(at).toISOString() : null;
  }

  /**
   * Resolves the authors of the last change of every term in one query, so the
   * list costs one lookup and not one per row.
   */
  private async auditUsers(
    manager: EntityManager,
    terms: Glossary[],
  ): Promise<Map<number, GlossaryAuditUserDto>> {
    const ids = [
      ...new Set(
        terms
          .map((term) => this.lastModifiedById(term))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    if (!ids.length) {
      return new Map();
    }

    const users = await manager.find(User, {
      where: { id: In(ids) },
      select: { id: true, first_name: true, last_name: true, email: true },
    });

    return new Map(
      (users ?? []).map((user) => [
        Number(user.id),
        {
          id: Number(user.id),
          name:
            [user.first_name, user.last_name]
              .filter((part) => !!part?.trim())
              .join(' ')
              .trim() || user.email,
          email: user.email,
        },
      ]),
    );
  }

  /**
   * The concept a row belongs to. A row that was never related is its own
   * concept, which is the state every row starts in.
   */
  private groupOf(glossary: Pick<Glossary, 'id' | 'group_id'>): number {
    return Number(glossary.group_id ?? glossary.id);
  }

  /** Rows that carry the same term, whatever their status. */
  private async findSameTitle(
    manager: EntityManager,
    title: string,
    excludeId?: number,
  ): Promise<Glossary[]> {
    const key = this.termKey(title);
    const all = await manager.find(Glossary);
    return all.filter(
      (g) =>
        this.termKey(g.title) === key &&
        (excludeId === undefined || Number(g.id) !== Number(excludeId)),
    );
  }

  /** Portfolio ids a row currently holds through an active link. */
  private async activePortfolioIds(
    manager: EntityManager,
    glossaryId: number,
  ): Promise<number[]> {
    const links = await manager.find(GlossaryPortfolio, {
      where: { glossary_id: glossaryId },
    });
    return links
      .filter((gp) => gp.auditableFields?.is_active)
      .map((gp) => Number(gp.portfolio_id));
  }

  /**
   * The invariant that replaces "one row per title": two **active** versions of
   * the same term may coexist as long as they do not claim the same portfolio.
   *
   * A version for a portfolio nobody else covers is legitimate — that is the
   * whole point of this module. Two versions on the same portfolio are not:
   * the public page would render both under the same filter with no way to
   * tell which one applies.
   *
   * Deactivated rows do not reserve anything. The old behaviour let a row
   * retired in 2023 block its own name forever, which is why the content ended
   * up being written straight into the database.
   */
  private async assertPortfoliosFree(
    manager: EntityManager,
    title: string,
    portfolioIds: number[],
    excludeId?: number,
  ): Promise<void> {
    const wanted = [...new Set((portfolioIds ?? []).map((id) => Number(id)))];
    if (!wanted.length) {
      return;
    }

    const siblings = (
      await this.findSameTitle(manager, title, excludeId)
    ).filter((s) => s.auditableFields?.is_active);

    for (const sibling of siblings) {
      const held = await this.activePortfolioIds(manager, Number(sibling.id));
      const clash = wanted.find((id) => held.includes(id));
      if (clash !== undefined) {
        throw new ConflictException(
          `The term "${this.normalizeTerm(title)}" already has a version for portfolio ${clash} (record ${sibling.id}). ` +
            'Two versions of the same term cannot share a portfolio.',
        );
      }
    }
  }

  private buildFindOptions(show: FindAllOptions) {
    const relations = {
      glossary_portfolio_array: { portfolio_object: true },
    };

    if (show === FindAllOptions.SHOW_ALL) {
      return { relations, order: { title: 'ASC' as const } };
    }

    return {
      relations,
      order: { title: 'ASC' as const },
      where: {
        auditableFields: {
          is_active: show !== FindAllOptions.SHOW_ONLY_INACTIVE,
        },
      },
    };
  }

  /**
   * Validates that every requested portfolio exists and returns them.
   * Throws when at least one id is unknown, so a bad file never silently
   * drops the portfolio assignment.
   */
  private async resolvePortfolios(
    manager: EntityManager,
    ids: number[],
  ): Promise<Portfolio[]> {
    const uniqueIds = [...new Set((ids ?? []).map((id) => Number(id)))].filter(
      (id) => Number.isInteger(id) && id > 0,
    );

    if (!uniqueIds.length) {
      return [];
    }

    const portfolios = await manager.find(Portfolio, {
      where: { id: In(uniqueIds) },
    });

    const found = new Set(portfolios.map((p) => Number(p.id)));
    const missing = uniqueIds.filter((id) => !found.has(id));

    if (missing.length) {
      throw new BadRequestException(
        `Unknown portfolio id(s): ${missing.join(', ')}`,
      );
    }

    return portfolios;
  }

  /**
   * Makes the stored portfolio assignment match `portfolioIds`.
   *
   * Rows are never deleted: the ones that no longer apply are deactivated and
   * an existing inactive row is reused when the same pair comes back. That
   * keeps the audit trail intact, which is what the rest of CLARISA does.
   */
  private async syncPortfolios(
    manager: EntityManager,
    glossaryId: number,
    portfolioIds: number[],
    userId: number,
  ): Promise<void> {
    const wanted = [...new Set((portfolioIds ?? []).map((id) => Number(id)))];

    const existing = await manager.find(GlossaryPortfolio, {
      where: { glossary_id: glossaryId },
    });

    const toDeactivate = existing.filter(
      (gp) =>
        gp.auditableFields?.is_active &&
        !wanted.includes(Number(gp.portfolio_id)),
    );

    for (const row of toDeactivate) {
      row.auditableFields.is_active = false;
      row.auditableFields.updated_by = userId;
    }

    const toSave: GlossaryPortfolio[] = [...toDeactivate];

    for (const portfolioId of wanted) {
      const current = existing.find(
        (gp) => Number(gp.portfolio_id) === portfolioId,
      );

      if (current) {
        if (!current.auditableFields?.is_active) {
          current.auditableFields.is_active = true;
          current.auditableFields.updated_by = userId;
          toSave.push(current);
        }
        continue;
      }

      const created = manager.create(GlossaryPortfolio, {
        glossary_id: glossaryId,
        portfolio_id: portfolioId,
      });
      created.auditableFields = {
        ...created.auditableFields,
        is_active: true,
        created_by: userId,
      } as GlossaryPortfolio['auditableFields'];
      toSave.push(created);
    }

    if (toSave.length) {
      await manager.save(GlossaryPortfolio, toSave);
    }
  }

  private async findOneWithRelations(
    manager: EntityManager,
    id: number,
  ): Promise<Glossary> {
    return manager.findOne(Glossary, {
      where: { id },
      relations: { glossary_portfolio_array: { portfolio_object: true } },
    });
  }

  // ------------------------------------------------------------------- read

  async findAllForAdmin(
    show: FindAllOptions = FindAllOptions.SHOW_ALL,
  ): Promise<GlossaryAdminDto[]> {
    const terms = await this._glossaryRepository.find(
      this.buildFindOptions(show) as never,
    );
    const users = await this.auditUsers(this._dataSource.manager, terms);

    return terms.map((term) => this.toAdminDto(term, users));
  }

  async findOneForAdmin(id: number): Promise<GlossaryAdminDto> {
    const term = await this.findOneWithRelations(this._dataSource.manager, id);

    if (!term) {
      throw new NotFoundException(`Glossary term ${id} was not found`);
    }

    const users = await this.auditUsers(this._dataSource.manager, [term]);
    return this.toAdminDto(term, users);
  }

  // ------------------------------------------------------------------ write

  async create(
    dto: CreateGlossaryTermDto,
    userData: UserData,
  ): Promise<GlossaryAdminDto> {
    const title = this.normalizeTerm(dto.term);
    const definition = (dto.definition ?? '').trim();

    if (!title) {
      throw new BadRequestException('The term is required');
    }
    if (!definition) {
      throw new BadRequestException('The definition is required');
    }

    return this._dataSource.transaction(async (manager) => {
      await this.resolvePortfolios(manager, dto.portfolio_ids);

      await this.assertPortfoliosFree(manager, title, dto.portfolio_ids);

      const groupId = await this.resolveGroupTarget(manager, dto.group_of);

      const glossary = manager.create(Glossary, {
        title,
        group_id: groupId,
        definition,
        source: this.toNullableText(dto.source),
        sourceUrl: this.toNullableText(dto.source_url),
        referenceDate: this.toNullableText(dto.reference_date),
        applicationName: dto.application_name ?? null,
        show_in_dashboard: dto.show_in_dashboard ?? false,
      });
      glossary.auditableFields = {
        ...glossary.auditableFields,
        is_active: true,
        created_by: userData.userId,
      } as Glossary['auditableFields'];

      const saved = await manager.save(Glossary, glossary);

      await this.syncPortfolios(
        manager,
        Number(saved.id),
        dto.portfolio_ids ?? [],
        userData.userId,
      );

      return this.toAdminDto(
        await this.findOneWithRelations(manager, Number(saved.id)),
      );
    });
  }

  async update(
    id: number,
    dto: UpdateGlossaryTermDto,
    userData: UserData,
  ): Promise<GlossaryAdminDto> {
    return this._dataSource.transaction(async (manager) => {
      const glossary = await manager.findOne(Glossary, { where: { id } });

      if (!glossary) {
        throw new NotFoundException(`Glossary term ${id} was not found`);
      }

      if (dto.term !== undefined) {
        const title = this.normalizeTerm(dto.term);
        if (!title) {
          throw new BadRequestException('The term cannot be empty');
        }

        await this.assertPortfoliosFree(
          manager,
          title,
          dto.portfolio_ids ?? (await this.activePortfolioIds(manager, id)),
          id,
        );

        glossary.title = title;
      }

      if (dto.definition !== undefined) {
        const definition = dto.definition.trim();
        if (!definition) {
          throw new BadRequestException('The definition cannot be empty');
        }
        glossary.definition = definition;
      }

      this.applyProvenance(glossary, dto);

      if (dto.show_in_dashboard !== undefined) {
        glossary.show_in_dashboard = dto.show_in_dashboard;
      }

      if (dto.application_name !== undefined) {
        glossary.applicationName = dto.application_name;
      }

      glossary.auditableFields.updated_by = userData.userId;
      await manager.save(Glossary, glossary);

      if (dto.portfolio_ids !== undefined) {
        await this.resolvePortfolios(manager, dto.portfolio_ids);
        await this.assertPortfoliosFree(
          manager,
          glossary.title,
          dto.portfolio_ids,
          id,
        );
        await this.syncPortfolios(
          manager,
          Number(id),
          dto.portfolio_ids,
          userData.userId,
        );
      }

      return this.toAdminDto(await this.findOneWithRelations(manager, id));
    });
  }

  async setStatus(
    id: number,
    isActive: boolean,
    userData: UserData,
  ): Promise<GlossaryAdminDto> {
    return this._dataSource.transaction(async (manager) => {
      const glossary = await manager.findOne(Glossary, { where: { id } });

      if (!glossary) {
        throw new NotFoundException(`Glossary term ${id} was not found`);
      }

      glossary.auditableFields.is_active = isActive;
      glossary.auditableFields.updated_by = userData.userId;
      await manager.save(Glossary, glossary);

      return this.toAdminDto(await this.findOneWithRelations(manager, id));
    });
  }

  /**
   * Resolves the group a new row is born into. `undefined` leaves it standing
   * alone; an id joins the group of that term, which is what the panel sends
   * when it adds the version of an existing term for another portfolio.
   */
  private async resolveGroupTarget(
    manager: EntityManager,
    groupOf?: number,
  ): Promise<number | null> {
    if (groupOf === undefined || groupOf === null) {
      return null;
    }

    const target = await manager.findOne(Glossary, {
      where: { id: Number(groupOf) },
    });
    if (!target) {
      throw new BadRequestException(`Glossary term ${groupOf} was not found`);
    }

    return this.groupOf(target);
  }

  /**
   * Splits the listed portfolios out of a term into a version of their own.
   *
   * The correction that used to be impossible: editing the definition of a term
   * that covers 2022-2024 and 2025-2030 rewrote both. Here the listed
   * portfolios move to a new row with the new definition, the source row keeps
   * the rest untouched, and the two stay related through the group.
   */
  async splitVersion(
    id: number,
    dto: SplitGlossaryTermDto,
    userData: UserData,
  ): Promise<{ source: GlossaryAdminDto; version: GlossaryAdminDto }> {
    const definition = (dto.definition ?? '').trim();
    if (!definition) {
      throw new BadRequestException('The definition is required');
    }

    return this._dataSource.transaction(async (manager) => {
      const source = await manager.findOne(Glossary, { where: { id } });
      if (!source) {
        throw new NotFoundException(`Glossary term ${id} was not found`);
      }

      const wanted = [
        ...new Set((dto.portfolio_ids ?? []).map((pid) => Number(pid))),
      ];
      if (!wanted.length) {
        throw new BadRequestException(
          'At least one portfolio has to move to the new version',
        );
      }

      const held = await this.activePortfolioIds(manager, id);
      const foreign = wanted.filter((pid) => !held.includes(pid));
      if (foreign.length) {
        throw new BadRequestException(
          `The term does not cover portfolio(s) ${foreign.join(', ')}, so they cannot be split off it. ` +
            'Add a version for them instead.',
        );
      }
      if (wanted.length >= held.length) {
        throw new BadRequestException(
          'The split would leave the term with no portfolio. Editing it applies to all of them, which is what you want here.',
        );
      }

      const remaining = held.filter((pid) => !wanted.includes(pid));
      source.auditableFields.updated_by = userData.userId;
      await manager.save(Glossary, source);
      await this.syncPortfolios(manager, id, remaining, userData.userId);

      const version = manager.create(Glossary, {
        title: source.title,
        group_id: this.groupOf(source),
        definition,
        source: this.toNullableText(dto.source) ?? source.source,
        sourceUrl: this.toNullableText(dto.source_url) ?? source.sourceUrl,
        referenceDate:
          this.toNullableText(dto.reference_date) ?? source.referenceDate,
        applicationName: source.applicationName,
        show_in_dashboard: source.show_in_dashboard,
      });
      version.auditableFields = {
        ...version.auditableFields,
        is_active: true,
        created_by: userData.userId,
        modification_justification: `Split from glossary term ${id} to hold its own definition for portfolio(s) ${wanted.join(', ')}`,
      } as Glossary['auditableFields'];

      const saved = await manager.save(Glossary, version);
      await this.syncPortfolios(
        manager,
        Number(saved.id),
        wanted,
        userData.userId,
      );

      return {
        source: this.toAdminDto(await this.findOneWithRelations(manager, id)),
        version: this.toAdminDto(
          await this.findOneWithRelations(manager, Number(saved.id)),
        ),
      };
    });
  }

  /**
   * Undoes a split: the portfolios of one row move onto another and the emptied
   * row is **deactivated**, never deleted, so a merge decided by mistake is one
   * reactivation away.
   */
  async mergeInto(
    id: number,
    intoId: number,
    userData: UserData,
  ): Promise<{ target: GlossaryAdminDto; merged: GlossaryAdminDto }> {
    if (Number(id) === Number(intoId)) {
      throw new BadRequestException('A term cannot be merged into itself');
    }

    return this._dataSource.transaction(async (manager) => {
      const source = await manager.findOne(Glossary, { where: { id } });
      const target = await manager.findOne(Glossary, {
        where: { id: Number(intoId) },
      });
      if (!source) {
        throw new NotFoundException(`Glossary term ${id} was not found`);
      }
      if (!target) {
        throw new NotFoundException(`Glossary term ${intoId} was not found`);
      }
      // The panel hides "Merge into" for an inactive term; this is the same rule
      // for a caller that skips the panel. Portfolios moved onto an inactive row
      // would vanish from the public glossary without any error.
      if (!target.auditableFields?.is_active) {
        throw new ConflictException(
          `Glossary term ${intoId} is inactive. Activate it before merging into it, ` +
            'or the portfolios that move there stop showing in the public glossary.',
        );
      }

      const moving = await this.activePortfolioIds(manager, id);
      const kept = await this.activePortfolioIds(manager, Number(intoId));
      const clash = moving.filter((pid) => kept.includes(pid));
      if (clash.length) {
        throw new ConflictException(
          `Both terms cover portfolio(s) ${clash.join(', ')}. Remove the overlap before merging, ` +
            'so no definition is dropped without anyone noticing.',
        );
      }

      await this.syncPortfolios(manager, id, [], userData.userId);
      await this.syncPortfolios(
        manager,
        Number(intoId),
        [...kept, ...moving],
        userData.userId,
      );

      source.auditableFields.is_active = false;
      source.auditableFields.updated_by = userData.userId;
      source.auditableFields.modification_justification = `Merged into glossary term ${intoId}; its portfolio(s) ${moving.join(', ') || '(none)'} moved there`;
      await manager.save(Glossary, source);

      target.auditableFields.updated_by = userData.userId;
      await manager.save(Glossary, target);

      return {
        target: this.toAdminDto(
          await this.findOneWithRelations(manager, Number(intoId)),
        ),
        merged: this.toAdminDto(await this.findOneWithRelations(manager, id)),
      };
    });
  }

  /**
   * Declares that a term is a version of another one.
   *
   * Both groups become one — every row already related to either side follows —
   * so the relation cannot leave half a group pointing at a row that moved.
   */
  async setGroup(
    id: number,
    intoId: number,
    userData: UserData,
  ): Promise<GlossaryAdminDto> {
    if (Number(id) === Number(intoId)) {
      throw new BadRequestException('A term cannot be a version of itself');
    }

    return this._dataSource.transaction(async (manager) => {
      const row = await manager.findOne(Glossary, { where: { id } });
      const target = await manager.findOne(Glossary, {
        where: { id: Number(intoId) },
      });
      if (!row) {
        throw new NotFoundException(`Glossary term ${id} was not found`);
      }
      if (!target) {
        throw new NotFoundException(`Glossary term ${intoId} was not found`);
      }

      const from = this.groupOf(row);
      const to = this.groupOf(target);
      if (from === to) {
        return this.toAdminDto(await this.findOneWithRelations(manager, id));
      }

      const all = await manager.find(Glossary);
      const moving = all.filter((g) => this.groupOf(g) === from);
      const staying = all.filter((g) => this.groupOf(g) === to);

      for (const incoming of moving.filter(
        (g) => g.auditableFields?.is_active,
      )) {
        const wanted = await this.activePortfolioIds(
          manager,
          Number(incoming.id),
        );
        for (const member of staying.filter(
          (g) => g.auditableFields?.is_active,
        )) {
          const held = await this.activePortfolioIds(
            manager,
            Number(member.id),
          );
          const clash = wanted.find((pid) => held.includes(pid));
          if (clash !== undefined) {
            throw new ConflictException(
              `Term ${incoming.id} and term ${member.id} both cover portfolio ${clash}, so they cannot be two versions of the same concept.`,
            );
          }
        }
      }

      for (const g of moving) {
        g.group_id = to;
        g.auditableFields.updated_by = userData.userId;
      }
      await manager.save(Glossary, moving);

      return this.toAdminDto(await this.findOneWithRelations(manager, id));
    });
  }

  /**
   * Takes a term out of its group. A row that is the anchor of a group (the one
   * the others point at) stays where it is: what is undone is the pointer, so
   * the caller ungroups the versions instead.
   */
  async clearGroup(id: number, userData: UserData): Promise<GlossaryAdminDto> {
    return this._dataSource.transaction(async (manager) => {
      const row = await manager.findOne(Glossary, { where: { id } });
      if (!row) {
        throw new NotFoundException(`Glossary term ${id} was not found`);
      }

      row.group_id = null;
      row.auditableFields.updated_by = userData.userId;
      await manager.save(Glossary, row);

      return this.toAdminDto(await this.findOneWithRelations(manager, id));
    });
  }

  // ------------------------------------------------------------------- bulk

  /**
   * Computes what a bulk load would do, without touching the database.
   * The admin panel shows this to the user before writing anything.
   */
  async bulkPreview(dto: GlossaryBulkDto): Promise<GlossaryBulkResultDto> {
    const manager = this._dataSource.manager;
    const plan = await this.buildBulkPlan(manager, dto);

    return {
      summary: this.summarize(plan),
      applied: false,
      rows: plan,
    };
  }

  /** Applies the bulk load inside a single transaction. */
  async bulkImport(
    dto: GlossaryBulkDto,
    userData: UserData,
  ): Promise<GlossaryBulkResultDto> {
    return this._dataSource.transaction(async (manager) => {
      const plan = await this.buildBulkPlan(manager, dto);

      const invalid = plan.filter(
        (row) => row.action === GlossaryBulkRowAction.INVALID,
      );
      if (invalid.length) {
        throw new BadRequestException(
          `${invalid.length} row(s) are invalid. Fix them before importing: ` +
            invalid
              .slice(0, 5)
              .map((row) => `row ${row.index} (${row.message})`)
              .join('; '),
        );
      }

      for (const row of plan) {
        if (row.action === GlossaryBulkRowAction.SKIP) {
          continue;
        }

        const portfolioIds = row.portfolios.map((p) => p.id);

        if (row.action === GlossaryBulkRowAction.CREATE) {
          row.glossary_id = await this.createFromBulkRow(
            manager,
            row,
            dto,
            userData,
          );
        } else {
          await this.updateFromBulkRow(manager, row, dto, userData);
        }

        // Una lista vacia aqui significa "esta carga no mapeo columna de
        // portafolios y no se eligio portafolio de lote", no "quitale todos
        // los portafolios". `syncPortfolios` desactiva toda asociacion que no
        // venga en la lista, asi que llamarlo con [] borraba en silencio los
        // portafolios de cada termino tocado: una carga hecha para corregir
        // definiciones sacaba los terminos del filtro de la pagina publica.
        // `update()` ya se protege con `if (dto.portfolio_ids !== undefined)`;
        // esta ruta no lo hacia. Quitar todos los portafolios de un termino
        // sigue siendo posible desde el CRUD individual.
        if (portfolioIds.length) {
          await this.syncPortfolios(
            manager,
            row.glossary_id,
            portfolioIds,
            userData.userId,
          );
        }
      }

      return {
        summary: this.summarize(plan),
        applied: true,
        rows: plan,
      };
    });
  }

  // --------------------------------------------------------- bulk internals

  private summarize(
    plan: GlossaryBulkRowResultDto[],
  ): GlossaryBulkResultDto['summary'] {
    const count = (action: GlossaryBulkRowAction) =>
      plan.filter((r) => r.action === action).length;

    return {
      total: plan.length,
      to_create: count(GlossaryBulkRowAction.CREATE),
      to_update: count(GlossaryBulkRowAction.UPDATE),
      to_reactivate: count(GlossaryBulkRowAction.REACTIVATE),
      skipped: count(GlossaryBulkRowAction.SKIP),
      invalid: count(GlossaryBulkRowAction.INVALID),
    };
  }

  /** Writes a planned CREATE row and returns the id it was stored under. */
  private async createFromBulkRow(
    manager: EntityManager,
    row: GlossaryBulkRowResultDto,
    dto: GlossaryBulkDto,
    userData: UserData,
  ): Promise<number> {
    const glossary = manager.create(Glossary, {
      title: row.term,
      definition: row.definition,
      source: row.source,
      sourceUrl: row.source_url,
      referenceDate: row.reference_date,
      applicationName: dto.application_name ?? null,
      show_in_dashboard: dto.show_in_dashboard ?? false,
    });
    glossary.auditableFields = {
      ...glossary.auditableFields,
      is_active: true,
      created_by: userData.userId,
    } as Glossary['auditableFields'];

    const saved = await manager.save(Glossary, glossary);
    return Number(saved.id);
  }

  /**
   * Writes a planned UPDATE or REACTIVATE row. Both write the same way; they
   * differ only in what the review screen told the user was going to happen.
   */
  private async updateFromBulkRow(
    manager: EntityManager,
    row: GlossaryBulkRowResultDto,
    dto: GlossaryBulkDto,
    userData: UserData,
  ): Promise<void> {
    const glossary = await manager.findOne(Glossary, {
      where: { id: row.glossary_id },
    });

    // The plan is built inside this same transaction, so the row is there.
    // Guard anyway: a silent crash mid-import would be far worse than a clear
    // message.
    if (!glossary) {
      throw new BadRequestException(
        `The term "${row.term}" (row ${row.index}) no longer exists. Run the preview again.`,
      );
    }

    glossary.definition = row.definition;
    glossary.title = row.term;

    // Same trap as the portfolios: a file that did not map a provenance column
    // means "this import says nothing about the source", not "clear it".
    // Overwriting with null would strip the attribution of every term touched
    // by an import meant to fix definitions. Clearing one stays possible from
    // the CRUD.
    this.applyProvenance(glossary, {
      source: row.source ?? undefined,
      source_url: row.source_url ?? undefined,
      reference_date: row.reference_date ?? undefined,
    });

    glossary.auditableFields.is_active = true;
    glossary.auditableFields.updated_by = userData.userId;
    if (dto.show_in_dashboard !== undefined) {
      glossary.show_in_dashboard = dto.show_in_dashboard;
    }

    await manager.save(Glossary, glossary);
  }

  /**
   * Turns the incoming rows into a per-row plan: what will be created,
   * updated, skipped or rejected, and with which portfolios.
   */
  private async buildBulkPlan(
    manager: EntityManager,
    dto: GlossaryBulkDto,
  ): Promise<GlossaryBulkRowResultDto[]> {
    const policy = dto.on_conflict ?? GlossaryBulkConflictPolicy.UPDATE;

    // Validate the whole set of portfolio ids up front (batch + per row).
    const allPortfolioIds = [
      ...(dto.portfolio_ids ?? []),
      ...dto.rows.flatMap((row) => row.portfolio_ids ?? []),
    ];
    const portfolios = await this.resolvePortfolios(manager, allPortfolioIds);
    const portfolioById = new Map<number, Portfolio>(
      portfolios.map((p) => [Number(p.id), p]),
    );

    const batchPortfolios = [
      ...new Set((dto.portfolio_ids ?? []).map((id) => Number(id))),
    ].map((id) => this.toPortfolioDto(portfolioById.get(id)));

    // Existing terms, indexed by their case-insensitive key. Inactive ones are
    // included on purpose so a re-uploaded file does not create a duplicate of
    // a term that is merely hidden.
    //
    // A list and not a single row: a term can now exist once per portfolio, and
    // the old map kept whichever row the database happened to return last —
    // which meant a file could update one version while the other, identical in
    // name, was never touched and nobody could tell.
    const existing = await manager.find(Glossary);
    const existingByKey = new Map<string, Glossary[]>();
    for (const term of existing) {
      const key = this.termKey(term.title);
      existingByKey.set(key, [...(existingByKey.get(key) ?? []), term]);
    }

    // Portfolios held by each row of a versioned term, resolved up front
    // because the per-row planning below is synchronous.
    const heldByTerm = new Map<number, number[]>();
    for (const rows of existingByKey.values()) {
      if (rows.length < 2) {
        continue;
      }
      for (const row of rows) {
        heldByTerm.set(
          Number(row.id),
          await this.activePortfolioIds(manager, Number(row.id)),
        );
      }
    }

    const seenInFile = new Map<string, number>();
    const plan: GlossaryBulkRowResultDto[] = [];

    dto.rows.forEach((row, position) => {
      const index = position + 1;
      const term = this.normalizeTerm(row.term);
      const definition = (row.definition ?? '').trim();

      const rowPortfolios = row.portfolio_ids?.length
        ? [...new Set(row.portfolio_ids.map((id) => Number(id)))].map((id) =>
            this.toPortfolioDto(portfolioById.get(id)),
          )
        : batchPortfolios;

      const base: GlossaryBulkRowResultDto = {
        index,
        term,
        definition,
        source: this.toNullableText(row.source),
        source_url: this.toNullableText(row.source_url),
        reference_date: this.toNullableText(row.reference_date),
        action: GlossaryBulkRowAction.CREATE,
        glossary_id: null,
        portfolios: rowPortfolios,
      };

      // Rejected here rather than by the DTO: a single unreadable date in a
      // 2000-row file would otherwise fail the entire payload instead of
      // pointing at the row that needs fixing.
      if (
        base.reference_date &&
        !REFERENCE_DATE_PATTERN.test(base.reference_date)
      ) {
        plan.push({
          ...base,
          action: GlossaryBulkRowAction.INVALID,
          message: `The reference date "${base.reference_date}" is not a calendar day in YYYY-MM-DD format`,
        });
        return;
      }

      if (!term) {
        plan.push({
          ...base,
          action: GlossaryBulkRowAction.INVALID,
          message: 'The term is empty',
        });
        return;
      }

      if (!definition) {
        plan.push({
          ...base,
          action: GlossaryBulkRowAction.INVALID,
          message: 'The definition is empty',
        });
        return;
      }

      const key = this.termKey(term);

      const duplicateOf = seenInFile.get(key);
      if (duplicateOf) {
        plan.push({
          ...base,
          action: GlossaryBulkRowAction.INVALID,
          message: `Duplicated in the file (already present on row ${duplicateOf})`,
        });
        return;
      }
      seenInFile.set(key, index);

      const candidates = existingByKey.get(key) ?? [];
      if (!candidates.length) {
        plan.push(base);
        return;
      }

      let stored = candidates[0];
      if (candidates.length > 1) {
        const wanted = rowPortfolios.map((p) => p.id);
        const matches = candidates.filter((candidate) =>
          (heldByTerm.get(Number(candidate.id)) ?? []).some((pid) =>
            wanted.includes(pid),
          ),
        );

        if (matches.length !== 1) {
          plan.push({
            ...base,
            action: GlossaryBulkRowAction.INVALID,
            message:
              `"${term}" exists in ${candidates.length} versions (records ${candidates
                .map((c) => c.id)
                .join(', ')}). ` +
              'Map a portfolio column, or pick one for the whole batch, so the row updates the right version.',
          });
          return;
        }

        stored = matches[0];
      }

      const isInactive = !stored.auditableFields?.is_active;

      if (policy === GlossaryBulkConflictPolicy.SKIP) {
        plan.push({
          ...base,
          action: GlossaryBulkRowAction.SKIP,
          glossary_id: Number(stored.id),
          current_definition: stored.definition,
          message: isInactive
            ? 'The term exists but is deactivated, and the policy is to skip it'
            : 'The term already exists and the policy is to skip it',
        });
        return;
      }

      plan.push({
        ...base,
        action: isInactive
          ? GlossaryBulkRowAction.REACTIVATE
          : GlossaryBulkRowAction.UPDATE,
        glossary_id: Number(stored.id),
        current_definition: stored.definition,
        message: isInactive
          ? 'This term was deactivated. Importing it will publish it again.'
          : undefined,
      });
    });

    return plan;
  }
}

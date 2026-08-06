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
import { GlossaryRepository } from './repositories/glossary.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UserData } from '../../shared/interfaces/user-data';
import {
  CreateGlossaryTermDto,
  GlossaryAdminDto,
  GlossaryBulkConflictPolicy,
  GlossaryBulkDto,
  GlossaryBulkResultDto,
  GlossaryBulkRowAction,
  GlossaryBulkRowResultDto,
  GlossaryTermPortfolioDto,
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

  private toPortfolioDto(portfolio: Portfolio): GlossaryTermPortfolioDto {
    return {
      id: Number(portfolio.id),
      name: portfolio.name,
      acronym: portfolio.acronym,
    };
  }

  private toAdminDto(glossary: Glossary): GlossaryAdminDto {
    const portfolios = (glossary.glossary_portfolio_array ?? [])
      .filter((gp) => gp.auditableFields?.is_active && gp.portfolio_object)
      .map((gp) => this.toPortfolioDto(gp.portfolio_object));

    return {
      id: Number(glossary.id),
      term: glossary.title,
      definition: glossary.definition,
      is_active: !!glossary.auditableFields?.is_active,
      show_in_dashboard: !!glossary.show_in_dashboard,
      application_name: glossary.applicationName,
      portfolios,
    };
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

    return terms.map((term) => this.toAdminDto(term));
  }

  async findOneForAdmin(id: number): Promise<GlossaryAdminDto> {
    const term = await this.findOneWithRelations(this._dataSource.manager, id);

    if (!term) {
      throw new NotFoundException(`Glossary term ${id} was not found`);
    }

    return this.toAdminDto(term);
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

      const duplicate = await this.findByTitle(manager, title);
      if (duplicate) {
        throw new ConflictException(
          `The term "${title}" already exists in the glossary`,
        );
      }

      const glossary = manager.create(Glossary, {
        title,
        definition,
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

        const duplicate = await this.findByTitle(manager, title);
        if (duplicate && Number(duplicate.id) !== Number(id)) {
          throw new ConflictException(
            `The term "${title}" already exists in the glossary`,
          );
        }

        glossary.title = title;
      }

      if (dto.definition !== undefined) {
        const definition = dto.definition.trim();
        if (!definition) {
          throw new BadRequestException('The definition cannot be empty');
        }
        glossary.definition = definition;
      }

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
          const glossary = manager.create(Glossary, {
            title: row.term,
            definition: row.definition,
            applicationName: dto.application_name ?? null,
            show_in_dashboard: dto.show_in_dashboard ?? false,
          });
          glossary.auditableFields = {
            ...glossary.auditableFields,
            is_active: true,
            created_by: userData.userId,
          } as Glossary['auditableFields'];

          const saved = await manager.save(Glossary, glossary);
          row.glossary_id = Number(saved.id);
        } else {
          // UPDATE and REACTIVATE write the same way; they differ only in what
          // the review screen told the user was going to happen.
          const glossary = await manager.findOne(Glossary, {
            where: { id: row.glossary_id },
          });

          // The plan is built inside this same transaction, so the row is
          // there. Guard anyway: a silent crash mid-import would be far worse
          // than a clear message.
          if (!glossary) {
            throw new BadRequestException(
              `The term "${row.term}" (row ${row.index}) no longer exists. Run the preview again.`,
            );
          }

          glossary.definition = row.definition;
          glossary.title = row.term;
          glossary.auditableFields.is_active = true;
          glossary.auditableFields.updated_by = userData.userId;
          if (dto.show_in_dashboard !== undefined) {
            glossary.show_in_dashboard = dto.show_in_dashboard;
          }
          await manager.save(Glossary, glossary);
        }

        await this.syncPortfolios(
          manager,
          row.glossary_id,
          portfolioIds,
          userData.userId,
        );
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
    const existing = await manager.find(Glossary);
    const existingByKey = new Map<string, Glossary>();
    for (const term of existing) {
      existingByKey.set(this.termKey(term.title), term);
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
        action: GlossaryBulkRowAction.CREATE,
        glossary_id: null,
        portfolios: rowPortfolios,
      };

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

      const stored = existingByKey.get(key);
      if (!stored) {
        plan.push(base);
        return;
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

  private async findByTitle(
    manager: EntityManager,
    title: string,
  ): Promise<Glossary> {
    return manager
      .createQueryBuilder(Glossary, 'g')
      .where('LOWER(TRIM(g.title)) = LOWER(:title)', { title })
      .getOne();
  }
}

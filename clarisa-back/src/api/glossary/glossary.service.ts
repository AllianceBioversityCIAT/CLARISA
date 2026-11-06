import { Inject, Injectable } from '@nestjs/common';
import { UpdateGlossaryDto } from './dto/update-glossary.dto';
import {
  Glossary,
  PUBLISHED_EDITORIAL_STATUSES,
} from './entities/glossary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GLOSSARY_STORAGE, GlossaryStorage } from './glossary-store';

/**
 * Entity columns `PATCH api/glossary/update` writes, as `repository.save`
 * did. `is_active` and the dates are not among them: they were never
 * columns of the entity itself (they live in the audit fields).
 */
const WRITABLE_COLUMNS = [
  'title',
  'definition',
  'applicationName',
  'group_id',
  'source',
  'sourceUrl',
  'referenceDate',
  'alternative_labels',
  'editorial_status',
  'replaced_by_id',
  'show_in_dashboard',
] as const;

/**
 * Public read side of the glossary (`api/glossary`, `api/v2/glossary`, the
 * export). Since 2026-11-06 it reads the glossary from the taxonomy
 * (`GlossaryStore`), the glossary's only store; the answer is the one the
 * `glossary` table gave, pinned by the contract specs and the parity e2e.
 */
@Injectable()
export class GlossaryService {
  constructor(
    @Inject(GLOSSARY_STORAGE) private readonly store: GlossaryStorage,
  ) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    onlyDashboard = false,
  ): Promise<Glossary[]> {
    // Thrown before any read, as it always was (not a rejected promise).
    if (
      option !== FindAllOptions.SHOW_ALL &&
      option !== FindAllOptions.SHOW_ONLY_ACTIVE &&
      option !== FindAllOptions.SHOW_ONLY_INACTIVE
    ) {
      throw Error('?!');
    }
    // A draft or a term under review is never public, whatever `show` says.
    // Every row that predates the editorial status is `approved`, so this
    // returns exactly what the endpoint returned before the column existed.
    // The store hands the terms ordered by term, like `ORDER BY title`.
    return this.store
      .all()
      .then((terms) =>
        terms.filter(
          (g) =>
            PUBLISHED_EDITORIAL_STATUSES.includes(g.editorialStatus) &&
            (!onlyDashboard || !!g.show_in_dashboard) &&
            (option === FindAllOptions.SHOW_ALL ||
              !!g.auditableFields?.is_active ===
                (option === FindAllOptions.SHOW_ONLY_ACTIVE)),
        ),
      );
  }

  /** A draft or a term under review is not public by id either. */
  async findOne(id: number): Promise<Glossary | null> {
    const g = await this.store.byId(Number(id));
    return g && PUBLISHED_EDITORIAL_STATUSES.includes(g.editorialStatus)
      ? g
      : null;
  }

  /**
   * The old bulk edit of v1 (`PATCH api/glossary/update`), now on the store.
   * As the repository `save` did, every entity column the body names is
   * written (no whitelist) and the payload is answered as it came; a single
   * object is accepted as well as a list. A term that does not exist fails
   * instead of being created with that id.
   */
  async update(updateGlossary: UpdateGlossaryDto[]): Promise<Glossary[]> {
    const list = (Array.isArray(updateGlossary)
      ? updateGlossary
      : [updateGlossary]
    ).filter(Boolean) as unknown as Record<string, unknown>[];
    // One transaction for the batch, as `repository.save(array)` was.
    await this.store.transaction(async (manager) => {
      for (const dto of list) {
        const g = await this.store.byId(Number(dto.id), manager);
        if (!g) throw new Error(`Glossary term ${dto.id} was not found`);
        for (const column of WRITABLE_COLUMNS) {
          if (dto[column] !== undefined)
            (g as unknown as Record<string, unknown>)[column] = dto[column];
        }
        await this.store.save(g, manager);
      }
    });
    return updateGlossary as unknown as Glossary[];
  }

  async getRolesPagination(offset?: number, limit = 10) {
    const all = (await this.store.all()).sort(
      (a, b) => Number(a.id) - Number(b.id),
    );
    const start = offset ?? 0;
    return {
      items: all.slice(start, start + limit),
      count: all.length,
    };
  }
}

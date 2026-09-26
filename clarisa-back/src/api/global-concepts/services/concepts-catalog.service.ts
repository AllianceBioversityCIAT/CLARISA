import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  GcCollection,
  GcCollectionMember,
} from '../entities/gc-collection.entity';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import {
  CollectionDto,
  CollectionMembersDto,
  ListValueDto,
  UpdateCollectionDto,
  UpdateListValueDto,
} from '../dto/catalog.dto';
import { ConceptsAdminService } from './concepts-admin.service';

/** Same slug rule as the migration seed ('IA (ex ante)' → 'ia_ex_ante'). */
export const toListValue = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const CODE = /^[a-z0-9][a-z0-9_-]{0,99}$/;

/**
 * Collections (curated subsets that do not touch the hierarchy) and the
 * controlled lists, for admins (task 1.5). List values are immutable once
 * created (V21): only label, order and the active flag change, so a concept
 * that stores a value never ends up pointing at nothing.
 */
@Injectable()
export class ConceptsCatalogService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: ConceptsAdminService,
  ) {}

  // ------------------------------------------------------------ collections

  async collections(code: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.scheme(manager, code);
    const rows = await manager.find(GcCollection, {
      where: { scheme_id: scheme.id },
      order: { label: 'ASC' },
    });
    return this.presentCollections(manager, rows);
  }

  async createCollection(code: string, dto: CollectionDto) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const collectionCode = dto.code.trim().toLowerCase();
      if (!CODE.test(collectionCode))
        throw new BadRequestException(
          'code may only contain lower-case letters, digits, _ and -',
        );
      const clash = await manager.findOne(GcCollection, {
        where: { scheme_id: scheme.id, code: collectionCode },
      });
      if (clash)
        throw new ConflictException(
          `The collection "${collectionCode}" already exists`,
        );
      const saved = await manager.save(
        GcCollection,
        manager.create(GcCollection, {
          scheme_id: scheme.id,
          code: collectionCode,
          label: dto.label.trim(),
          ordered: dto.ordered === true,
        }),
      );
      return (await this.presentCollections(manager, [saved]))[0];
    });
  }

  async updateCollection(
    code: string,
    collectionCode: string,
    dto: UpdateCollectionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const c = await this.collection(manager, scheme, collectionCode);
      if (dto.label !== undefined) {
        if (!dto.label.trim())
          throw new BadRequestException('label cannot be empty');
        c.label = dto.label.trim();
      }
      if (dto.ordered !== undefined) c.ordered = dto.ordered;
      await manager.save(GcCollection, c);
      return (await this.presentCollections(manager, [c]))[0];
    });
  }

  /** Replaces the members; every term must be a concept of the same scheme (V33). */
  async setMembers(
    code: string,
    collectionCode: string,
    dto: CollectionMembersDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const c = await this.collection(manager, scheme, collectionCode);
      const termIds = [...new Set(dto.term_ids.map(Number))];
      const concepts = termIds.length
        ? await manager.find(GcConcept, {
            where: { scheme_id: scheme.id, term_id: In(termIds) },
          })
        : [];
      const found = new Map(concepts.map((x) => [Number(x.term_id), x]));
      const missing = termIds.filter((t) => !found.has(t));
      if (missing.length)
        throw new BadRequestException(
          `Not concepts of "${scheme.code}": ${missing.join(', ')}`,
        );
      await manager.delete(GcCollectionMember, { collection_id: c.id });
      if (termIds.length)
        await manager.save(
          GcCollectionMember,
          termIds.map((t, i) =>
            manager.create(GcCollectionMember, {
              collection_id: c.id,
              concept_id: found.get(t)!.id,
              position: c.ordered ? i + 1 : null,
            }),
          ),
        );
      return (await this.presentCollections(manager, [c]))[0];
    });
  }

  async deleteCollection(code: string, collectionCode: string) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const c = await this.collection(manager, scheme, collectionCode);
      await manager.delete(GcCollectionMember, { collection_id: c.id });
      await manager.delete(GcCollection, { id: c.id });
      return { deleted: c.code };
    });
  }

  // ------------------------------------------------------------------ lists

  /** Every value of the lists the scheme sees, inactive ones included. */
  async listValues(code: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.scheme(manager, code);
    const rows = await manager.find(GcListValue, {
      where: { scope: In(['', scheme.code]) },
      order: { list_code: 'ASC', sort: 'ASC' },
    });
    return rows.map((r) => this.presentValue(r));
  }

  /**
   * Adds a value. `shared` puts it in every scheme's list (scope ''), else
   * only this scheme's. The stored value is derived from the label unless
   * given, and can never be changed afterwards (V21).
   */
  async addListValue(code: string, dto: ListValueDto) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const listCode = dto.list_code.trim().toLowerCase();
      const known = await manager.count(GcListValue, {
        where: { list_code: listCode },
      });
      if (!known && !dto.new_list)
        throw new BadRequestException(
          `There is no list "${listCode}"; send new_list: true to start one`,
        );
      const value = toListValue(dto.value ?? dto.label);
      if (!value)
        throw new BadRequestException('The label gives an empty value');
      const scope = dto.shared ? '' : scheme.code;
      const clash = await manager.findOne(GcListValue, {
        where: { list_code: listCode, value, scope: In(['', scheme.code]) },
      });
      if (clash)
        throw new ConflictException(
          clash.is_active
            ? `"${value}" is already a value of ${listCode}`
            : `"${value}" exists but is inactive; reactivate it instead`,
        );
      // The scheme sees shared and own values as one list: append after both.
      const last = await manager.find(GcListValue, {
        where: { list_code: listCode, scope: In(['', scheme.code]) },
        order: { sort: 'DESC' },
      });
      const saved = await manager.save(
        GcListValue,
        manager.create(GcListValue, {
          scope,
          list_code: listCode,
          value,
          label: dto.label.trim(),
          sort: dto.sort ?? (last[0]?.sort ?? -1) + 1,
          is_active: true,
        }),
      );
      return this.presentValue(saved);
    });
  }

  /** Label, order or active flag; the value itself is immutable (V21). */
  async updateListValue(code: string, id: number, dto: UpdateListValueDto) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const row = await manager.findOne(GcListValue, { where: { id } });
      if (!row || (row.scope !== '' && row.scope !== scheme.code))
        throw new NotFoundException('List value not found');
      if (dto.label !== undefined) {
        if (!dto.label.trim())
          throw new BadRequestException('label cannot be empty');
        row.label = dto.label.trim();
      }
      if (dto.sort !== undefined) row.sort = dto.sort;
      if (dto.is_active !== undefined) row.is_active = dto.is_active;
      await manager.save(GcListValue, row);
      return this.presentValue(row);
    });
  }

  // ---------------------------------------------------------------- helpers

  private presentValue(r: GcListValue) {
    return {
      id: Number(r.id),
      list_code: r.list_code,
      value: r.value,
      label: r.label,
      sort: r.sort,
      is_active: !!r.is_active,
      shared: r.scope === '',
    };
  }

  private async presentCollections(
    manager: EntityManager,
    rows: GcCollection[],
  ) {
    const ids = rows.map((r) => Number(r.id));
    const members = ids.length
      ? await manager.find(GcCollectionMember, {
          where: { collection_id: In(ids) },
        })
      : [];
    const conceptIds = [...new Set(members.map((m) => Number(m.concept_id)))];
    const concepts = conceptIds.length
      ? await manager.find(GcConcept, { where: { id: In(conceptIds) } })
      : [];
    const byId = new Map(concepts.map((c) => [Number(c.id), c]));
    return rows.map((r) => {
      const own = members
        .filter((m) => Number(m.collection_id) === Number(r.id))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return {
        code: r.code,
        label: r.label,
        ordered: !!r.ordered,
        members: own
          .map((m) => byId.get(Number(m.concept_id)))
          .filter((c): c is GcConcept => !!c)
          .map((c) => ({
            term_id: Number(c.term_id),
            preferred_label: c.preferred_label,
            status: c.status,
          })),
      };
    });
  }

  private async scheme(manager: EntityManager, code: string) {
    const scheme = await manager.findOne(GcScheme, {
      where: { code: (code ?? '').toLowerCase() },
    });
    if (!scheme)
      throw new NotFoundException(`Concept scheme "${code}" was not found`);
    return scheme;
  }

  private async collection(
    manager: EntityManager,
    scheme: GcScheme,
    collectionCode: string,
  ) {
    const c = await manager.findOne(GcCollection, {
      where: {
        scheme_id: scheme.id,
        code: (collectionCode ?? '').toLowerCase(),
      },
    });
    if (!c)
      throw new NotFoundException(
        `Collection "${collectionCode}" was not found`,
      );
    return c;
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { GcField, GcFieldType } from '../entities/gc-field.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { CreateFieldDto, UpdateFieldDto } from '../dto/field.dto';
import {
  CUSTOM_COLUMN_PREFIX,
  FIELD_CODE,
  isReservedExtraKey,
  sortFields,
} from '../utils/custom-fields';
import { IMPORT_FIELDS } from '../utils/import-fields';
import { ConceptGraphLoader } from './concept-graph.loader';
import { ConceptsAdminService } from './concepts-admin.service';

const LIST_TYPES = [GcFieldType.LIST, GcFieldType.MULTI_LIST];

/**
 * Custom metadata fields of a scheme (contract v2 §2): definitions only —
 * the values live in `gc_concepts.extra` and are checked by the admin
 * service on every concept write. A field is never deleted: deactivating it
 * keeps what is stored and stops accepting new values.
 */
@Injectable()
export class ConceptsFieldsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: ConceptsAdminService,
    private readonly loader: ConceptGraphLoader,
  ) {}

  /** Every definition, active and inactive, in display order. */
  async list(code: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const rows = await manager.find(GcField, {
      where: { scheme_id: scheme.id },
    });
    return sortFields(rows).map((f) => this.present(f));
  }

  async create(code: string, dto: CreateFieldDto) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const fieldCode = (dto.code ?? '').trim().toLowerCase();
      if (!FIELD_CODE.test(fieldCode))
        throw new BadRequestException(
          'code must start with a letter and contain only lower-case letters, digits and _ (max 50)',
        );
      if (isReservedExtraKey(fieldCode))
        throw new BadRequestException(`"${fieldCode}" is a reserved name`);
      const clash = await manager.findOne(GcField, {
        where: { scheme_id: scheme.id, code: fieldCode },
      });
      if (clash)
        throw new ConflictException(
          `The field "${fieldCode}" already exists${clash.is_active ? '' : ' (inactive: reactivate it instead)'}`,
        );
      let listCode: string | null = null;
      if (LIST_TYPES.includes(dto.type)) {
        listCode = (dto.list_code ?? '').trim().toLowerCase();
        if (!listCode)
          throw new BadRequestException(`A ${dto.type} field needs list_code`);
        const known = await manager.count(GcListValue, {
          where: { list_code: listCode, scope: In(['', scheme.code]) },
        });
        if (!known)
          throw new BadRequestException(
            `There is no list "${listCode}" in "${scheme.code}"`,
          );
      } else if (dto.list_code) {
        throw new BadRequestException(
          `Only list and multi_list fields take a list_code`,
        );
      }
      const last = await manager.find(GcField, {
        where: { scheme_id: scheme.id },
        order: { sort: 'DESC' },
      });
      const saved = await manager.save(
        GcField,
        manager.create(GcField, {
          scheme_id: scheme.id,
          code: fieldCode,
          label: dto.label.trim(),
          type: dto.type,
          list_code: listCode,
          required: dto.required === true,
          is_public: dto.is_public !== false,
          sort: dto.sort ?? (last[0]?.sort ?? -1) + 1,
          is_active: true,
          help: dto.help?.trim() || null,
        }),
      );
      return this.present(saved);
    });
  }

  /** Label, help, flags and order; `code` and `type` never change. */
  async update(code: string, id: number, dto: UpdateFieldDto) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const row = await manager.findOne(GcField, {
        where: { id, scheme_id: scheme.id },
      });
      if (!row) throw new NotFoundException('Field not found');
      if (dto.label !== undefined) {
        if (!dto.label.trim())
          throw new BadRequestException('label cannot be empty');
        row.label = dto.label.trim();
      }
      if (dto.help !== undefined) row.help = dto.help?.trim() || null;
      if (dto.required !== undefined) row.required = dto.required;
      if (dto.is_public !== undefined) row.is_public = dto.is_public;
      if (dto.sort !== undefined) row.sort = dto.sort;
      if (dto.is_active !== undefined) row.is_active = dto.is_active;
      await manager.save(GcField, row);
      return this.present(row);
    });
  }

  /**
   * Target fields of the import wizard: the built-in ones plus `x:<code>`
   * for each active custom field, so a sheet column can map to either.
   */
  async importFields(code: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const custom = await this.loader.fields(manager, scheme);
    return [
      ...IMPORT_FIELDS.map((f) => ({ ...f, custom: false })),
      ...sortFields(custom).map((f) => ({
        field: `${CUSTOM_COLUMN_PREFIX}${f.code}`,
        label: f.label,
        hint: f.help?.trim() || `${f.label} (custom field, ${f.type})`,
        custom: true,
        type: f.type,
        list_code: f.list_code ?? null,
      })),
    ];
  }

  private present(f: GcField) {
    return {
      id: Number(f.id),
      code: f.code,
      label: f.label,
      type: f.type,
      list_code: f.list_code ?? null,
      required: !!f.required,
      is_public: !!f.is_public,
      sort: Number(f.sort ?? 0),
      is_active: !!f.is_active,
      help: f.help ?? null,
      created_at: f.created_at ?? null,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcHistoryAction } from '../entities/gc-history.entity';
import { GcIcon } from '../entities/gc-icon.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { IconDto, UpdateIconDto } from '../dto/icon.dto';
import { presentIcon } from '../utils/concept-presenter';
import { isRealDay } from '../utils/custom-fields';
import { ConceptsAdminService, GcActor } from './concepts-admin.service';

/** Columns an icon DTO writes; `id` and `concept_id` are never taken from a body. */
const ICON_FIELDS = [
  'icon_code',
  'icon_status',
  'file_format',
  'file_name',
  'designer',
  'designer_country',
  'year_created',
  'rights_and_licence',
  'alt_text',
  'file_link_primary',
  'file_link_backup',
  'date_added',
] as const;

/** List-driven icon columns and the list each is checked against. */
const ICON_LISTS: Record<string, string> = {
  icon_status: 'icon_status',
  file_format: 'icon_format',
};

/** A DATE column comes back as a Date or a string depending on the driver. */
const day = (v: string | Date | null | undefined): string | null => {
  if (!v) return null;
  return typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);
};

/** Status whose icon is shown to readers, so it must be described for screen readers. */
const FINAL = 'final';

/**
 * Icons of a concept (contract v2 §1; checklist rows 1 and 13). The term
 * stays the primary record: an icon hangs from its concept and moves with it
 * on a merge. Every write is logged on the concept and revises a published
 * concept, because the icon is part of what the public record shows.
 */
@Injectable()
export class ConceptsIconsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: ConceptsAdminService,
  ) {}

  async list(code: string, termId: number) {
    const manager = this.dataSource.manager;
    const scheme = await this.scheme(manager, code);
    const concept = await this.admin.findConcept(manager, scheme, termId);
    const rows = await manager.find(GcIcon, {
      where: { concept_id: concept.id },
      order: { id: 'ASC' },
    });
    return rows.map((i) => this.present(i, concept));
  }

  async create(code: string, termId: number, dto: IconDto, actor: GcActor) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const concept = await this.admin.findConcept(manager, scheme, termId);
      // Double submit: the same file attached twice returns the first one.
      if (dto.file_link_primary) {
        const same = await manager.findOne(GcIcon, {
          where: {
            concept_id: Number(concept.id),
            file_link_primary: dto.file_link_primary,
          },
        });
        if (same) return this.present(same, concept);
      }
      const icon = manager.create(GcIcon, { concept_id: Number(concept.id) });
      await this.apply(manager, scheme, icon, dto);
      const saved = await manager.save(GcIcon, icon);
      await this.admin.touch(
        manager,
        concept,
        GcHistoryAction.ICONS,
        { icon: { from: null, to: this.view(saved) } },
        actor,
        randomUUID(),
      );
      return this.present(saved, concept);
    });
  }

  async update(code: string, id: number, dto: UpdateIconDto, actor: GcActor) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const { icon, concept } = await this.find(manager, scheme, id);
      const before = this.view(icon);
      await this.apply(manager, scheme, icon, dto);
      await manager.save(GcIcon, icon);
      const after = this.view(icon);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await this.admin.touch(
          manager,
          concept,
          GcHistoryAction.ICONS,
          { icon: { from: before, to: after } },
          actor,
          randomUUID(),
        );
      }
      return this.present(icon, concept);
    });
  }

  async remove(code: string, id: number, actor: GcActor) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const { icon, concept } = await this.find(manager, scheme, id);
      await manager.delete(GcIcon, { id: icon.id });
      await this.admin.touch(
        manager,
        concept,
        GcHistoryAction.ICONS,
        { icon: { from: this.view(icon), to: null } },
        actor,
        randomUUID(),
      );
      return { deleted: Number(icon.id) };
    });
  }

  // ---------------------------------------------------------------- helpers

  /**
   * Copies the sent fields, normalised, then checks the merged icon: a PATCH
   * that only flips the status to `final` must still find alt text, and one
   * that empties the alt text of a final icon is refused the same way.
   */
  private async apply(
    manager: EntityManager,
    scheme: GcScheme,
    icon: GcIcon,
    dto: Partial<IconDto>,
  ) {
    if (dto.date_added && !isRealDay(dto.date_added)) {
      throw new BadRequestException(
        'date_added must be a real date (YYYY-MM-DD)',
      );
    }
    const lists = await this.admin.loadLists(manager, scheme);
    const target = icon as unknown as Record<string, unknown>;
    for (const field of ICON_FIELDS) {
      const raw = (dto as Record<string, unknown>)[field];
      if (raw === undefined) continue;
      if (raw === null || raw === '') {
        target[field] = null;
        continue;
      }
      if (field === 'year_created') {
        target[field] = Number(raw);
        continue;
      }
      const text = String(raw).replace(/\s+/g, ' ').trim();
      const listCode = ICON_LISTS[field];
      if (listCode) {
        const value = lists.get(listCode)?.get(text.toLowerCase());
        if (!value) {
          throw new BadRequestException(
            `"${text}" is not a value of the ${listCode} list (field ${field})`,
          );
        }
        target[field] = value;
      } else {
        target[field] = text || null;
      }
    }
    if (!icon.icon_status) {
      throw new BadRequestException('icon_status is required');
    }
    if (icon.icon_status === FINAL && !(icon.alt_text ?? '').trim()) {
      throw new BadRequestException(
        'A final icon needs alt text: it is what a screen reader says instead of the image',
      );
    }
  }

  /** An icon of this scheme, or 404 — never an icon of another scheme's concept. */
  private async find(manager: EntityManager, scheme: GcScheme, id: number) {
    const icon = await manager.findOne(GcIcon, { where: { id } });
    const concept = icon
      ? await manager.findOne(GcConcept, { where: { id: icon.concept_id } })
      : null;
    if (!icon || !concept || Number(concept.scheme_id) !== Number(scheme.id)) {
      throw new NotFoundException(
        `Icon ${id} was not found in "${scheme.code}"`,
      );
    }
    return { icon, concept };
  }

  private async scheme(manager: EntityManager, code: string) {
    const scheme = await manager.findOne(GcScheme, {
      where: { code: (code ?? '').toLowerCase() },
    });
    if (!scheme)
      throw new NotFoundException(`Concept scheme "${code}" was not found`);
    return scheme;
  }

  /** What the history keeps of an icon: the public view plus its id. */
  private view(i: GcIcon) {
    return { id: Number(i.id), ...presentIcon(i) };
  }

  /** Every column + id, and the concept's public term_id for the panel. */
  private present(i: GcIcon, concept: GcConcept) {
    return {
      id: Number(i.id),
      concept_id: Number(i.concept_id),
      term_id: Number(concept.term_id),
      icon_code: i.icon_code ?? null,
      icon_status: i.icon_status ?? null,
      file_name: i.file_name ?? null,
      file_format: i.file_format ?? null,
      designer: i.designer ?? null,
      designer_country: i.designer_country ?? null,
      year_created:
        i.year_created === null || i.year_created === undefined
          ? null
          : Number(i.year_created),
      rights_and_licence: i.rights_and_licence ?? null,
      alt_text: i.alt_text ?? null,
      file_link_primary: i.file_link_primary ?? null,
      file_link_backup: i.file_link_backup ?? null,
      date_added: day(i.date_added),
    };
  }
}

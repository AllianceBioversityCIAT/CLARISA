import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  GC_PUBLIC_STATUSES,
  GcConcept,
  GcConceptStatus,
} from '../entities/gc-concept.entity';
import { GcCollectionMember } from '../entities/gc-collection.entity';
import {
  GcFieldChange,
  GcHistory,
  GcHistoryAction,
} from '../entities/gc-history.entity';
import { GcIcon } from '../entities/gc-icon.entity';
import {
  GcLabel,
  GcLabelKind,
  GcLabelStatus,
} from '../entities/gc-label.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import {
  GcMapping,
  GcMappingJustification,
  GcMappingStatus,
  GcMatchType,
} from '../entities/gc-mapping.entity';
import { GcProposal, GcProposalState } from '../entities/gc-proposal.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import {
  ConceptFieldsDto,
  ConceptLabelsDto,
  ConceptStatusDto,
  CreateConceptDto,
  MappingDto,
  MergeDto,
  RelationDto,
  UpdateConceptDto,
} from '../dto/concept-admin.dto';
import { presentConcepts } from '../utils/concept-presenter';
import { ConceptGraphLoader } from './concept-graph.loader';

/** Who is writing: the person, and whether it is a direct admin edit or an approved request. */
export interface GcActor {
  email: string;
  action?: GcHistoryAction;
  proposalId?: number | null;
}

/** Fields whose change bumps the record version of a published concept (V22). */
const VERSIONED_FIELDS = [
  'preferred_label',
  'language',
  'definition',
  'short_definition',
  'scope_note',
  'example_of_use',
  'term_type',
  'meliaf_function',
  'meliaf_phase_primary',
  'meliaf_phase_also',
  'source_citation',
  'source_url',
  'derivation',
  'status',
  'replaced_by_id',
] as const;

/** Every field copied from a DTO onto the entity. */
const WRITABLE_FIELDS = [
  'language',
  'definition',
  'short_definition',
  'scope_note',
  'example_of_use',
  'term_type',
  'meliaf_function',
  'meliaf_phase_primary',
  'meliaf_phase_also',
  'source_citation',
  'source_url',
  'derivation',
  'origin',
  'validated_by',
  'date_validated',
  'steward',
  'rights_note',
  'notes',
] as const;

/** Which controlled list each list-driven field is checked against. */
const LIST_FIELDS: Record<string, string> = {
  term_type: 'term_type',
  meliaf_function: 'meliaf_function',
  meliaf_phase_primary: 'meliaf_phase',
  meliaf_phase_also: 'meliaf_phase',
  derivation: 'derivation',
  language: 'language',
};

const norm = (text: string) => (text ?? '').replace(/\s+/g, ' ').trim();
const key = (text: string) => norm(text).toLowerCase();

/**
 * Write side of Global Concepts. Every write runs in one transaction together
 * with its change-log rows, and enforces the integrity rules of the design
 * (V1–V43) at write time: the database has no foreign keys by design, so the
 * service is the only place integrity can live.
 */
@Injectable()
export class ConceptsAdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly loader: ConceptGraphLoader,
  ) {}

  // ------------------------------------------------------------------ reads

  /** Admin list: every status, plus the internal fields the panel needs. */
  async list(code: string, status?: string) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const concepts = await manager.find(GcConcept, {
      where: {
        scheme_id: scheme.id,
        ...(status ? { status: status as GcConceptStatus } : {}),
      },
      order: { preferred_label: 'ASC' },
    });
    return this.presentAdmin(manager, scheme, concepts);
  }

  async get(code: string, termId: number) {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const concept = await this.findConcept(manager, scheme, termId);
    const history = await manager.find(GcHistory, {
      where: { concept_id: concept.id },
      order: { id: 'ASC' },
    });
    return {
      ...(await this.presentAdmin(manager, scheme, [concept]))[0],
      history,
    };
  }

  // ----------------------------------------------------------------- writes

  async create(code: string, dto: CreateConceptDto, actor: GcActor) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      return this.createIn(manager, scheme, dto, actor);
    });
  }

  /**
   * Creates a concept inside a transaction that already holds the scheme
   * lock (also used by imports and approved requests).
   */
  async createIn(
    manager: EntityManager,
    scheme: GcScheme,
    dto: CreateConceptDto,
    actor: GcActor,
    txId: string = randomUUID(),
  ) {
    const label = norm(dto.preferred_label);
    if (!label) throw new BadRequestException('preferred_label is required');
    const lists = await this.loadLists(manager, scheme);
    const fields = this.cleanFields(dto, lists);
    const language = (fields.language as string) ?? scheme.default_language;
    await this.assertPreferredLabelFree(manager, scheme, label, language);

    const termId = await this.allocateTermId(manager, scheme, dto.term_id);
    const status = dto.status ?? GcConceptStatus.DRAFT;
    if (status === GcConceptStatus.DEPRECATED) {
      throw new BadRequestException('A new concept cannot start as deprecated');
    }
    const today = new Date().toISOString().slice(0, 10);
    const concept = manager.create(GcConcept, {
      ...fields,
      scheme_id: scheme.id,
      term_id: termId,
      preferred_label: label,
      language,
      status,
      version: '1.0',
      date_created: today,
      date_modified: today,
      created_by_email: actor.email,
      updated_by_email: actor.email,
    });
    const saved = await manager.save(GcConcept, concept);
    await this.log(
      manager,
      saved.id,
      actor.action ?? GcHistoryAction.CREATE,
      null,
      this.snapshot(saved),
      actor,
      txId,
    );
    return (await this.presentAdmin(manager, scheme, [saved]))[0];
  }

  async update(
    code: string,
    termId: number,
    dto: UpdateConceptDto,
    actor: GcActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const concept = await this.findConcept(manager, scheme, termId);
      await this.updateIn(manager, scheme, concept, dto, actor);
      return (await this.presentAdmin(manager, scheme, [concept]))[0];
    });
  }

  async updateIn(
    manager: EntityManager,
    scheme: GcScheme,
    concept: GcConcept,
    dto: UpdateConceptDto,
    actor: GcActor,
    txId: string = randomUUID(),
  ) {
    const before = this.snapshot(concept);
    const lists = await this.loadLists(manager, scheme);
    Object.assign(concept, this.cleanFields(dto, lists));
    if (dto.preferred_label !== undefined) {
      const label = norm(dto.preferred_label);
      if (!label)
        throw new BadRequestException('preferred_label cannot be empty');
      concept.preferred_label = label;
    }
    if (dto.preferred_label !== undefined || dto.language !== undefined) {
      await this.assertPreferredLabelFree(
        manager,
        scheme,
        concept.preferred_label,
        concept.language,
        concept.id,
      );
      await this.assertNoOwnLabelClash(manager, concept);
    }
    await this.finishWrite(
      manager,
      concept,
      before,
      actor,
      txId,
      GcHistoryAction.UPDATE,
    );
  }

  /**
   * Editorial status. Deprecation needs a replacement (an approved concept of
   * the same scheme, no chain back to this one) or a written reason (D4, V11);
   * a concept others point to as their replacement cannot be deprecated
   * without a replacement of its own (V36).
   */
  async setStatus(
    code: string,
    termId: number,
    dto: ConceptStatusDto,
    actor: GcActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const concept = await this.findConcept(manager, scheme, termId);
      await this.setStatusIn(manager, scheme, concept, dto, actor);
      return (await this.presentAdmin(manager, scheme, [concept]))[0];
    });
  }

  async setStatusIn(
    manager: EntityManager,
    scheme: GcScheme,
    concept: GcConcept,
    dto: ConceptStatusDto,
    actor: GcActor,
    txId: string = randomUUID(),
  ) {
    const before = this.snapshot(concept);
    if (dto.status === GcConceptStatus.DEPRECATED) {
      let replacement: GcConcept | null = null;
      if (dto.replaced_by_term_id) {
        replacement = await this.findConcept(
          manager,
          scheme,
          dto.replaced_by_term_id,
        );
        if (Number(replacement.id) === Number(concept.id)) {
          throw new BadRequestException('A concept cannot replace itself');
        }
        if (replacement.status !== GcConceptStatus.APPROVED) {
          throw new BadRequestException(
            'The replacement has to be an approved concept',
          );
        }
        await this.assertNoReplacementCycle(manager, concept, replacement);
      } else if (!norm(dto.reason ?? '')) {
        throw new BadRequestException(
          'Deprecating needs a replacement or a written reason',
        );
      }
      const dependants = await manager.count(GcConcept, {
        where: { replaced_by_id: concept.id },
      });
      if (dependants && !replacement) {
        throw new BadRequestException(
          `${dependants} concept(s) name this one as their replacement; give it a replacement of its own`,
        );
      }
      concept.replaced_by_id = replacement ? Number(replacement.id) : null;
    } else {
      if (dto.replaced_by_term_id) {
        throw new BadRequestException(
          'Only a deprecated concept has a replacement',
        );
      }
      concept.replaced_by_id = null;
    }
    concept.status = dto.status;
    const extra = dto.reason
      ? { reason: { from: null, to: norm(dto.reason) } }
      : {};
    await this.finishWrite(
      manager,
      concept,
      before,
      actor,
      txId,
      GcHistoryAction.STATUS,
      extra,
    );
  }

  /**
   * Replaces every label of a concept except its default-language preferred
   * label (which lives on the concept, V4). Rejects a `pref` in the default
   * language, two `pref` rows in one language (S14) and any label equal to a
   * preferred label of the same language (S13).
   */
  async setLabels(
    code: string,
    termId: number,
    dto: ConceptLabelsDto,
    actor: GcActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const concept = await this.findConcept(manager, scheme, termId);
      await this.setLabelsIn(manager, scheme, concept, dto.labels, actor);
      return (await this.presentAdmin(manager, scheme, [concept]))[0];
    });
  }

  async setLabelsIn(
    manager: EntityManager,
    scheme: GcScheme,
    concept: GcConcept,
    input: ConceptLabelsDto['labels'],
    actor: GcActor,
    txId: string = randomUUID(),
  ) {
    const lists = await this.loadLists(manager, scheme);
    const languages = lists.get('language');
    const seen = new Set<string>();
    const prefLangs = new Set<string>([concept.language]);
    const prefByLang = new Map<string, string>([
      [concept.language, key(concept.preferred_label)],
    ]);
    const clean: Partial<GcLabel>[] = [];
    for (const raw of input ?? []) {
      const label = norm(raw.label);
      const language = (raw.language ?? concept.language).toLowerCase();
      if (!label) continue;
      if (languages && !languages.has(language)) {
        throw new BadRequestException(`Unknown language "${language}"`);
      }
      if (raw.kind === GcLabelKind.PREF) {
        if (prefLangs.has(language)) {
          throw new BadRequestException(
            `There is already a preferred label in "${language}"`,
          );
        }
        prefLangs.add(language);
        prefByLang.set(language, key(label));
      }
      const k = `${language}|${key(label)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      clean.push({
        concept_id: concept.id,
        label,
        language,
        kind: raw.kind,
        status: raw.status ?? GcLabelStatus.ACTIVE,
      });
    }
    for (const l of clean) {
      if (
        l.kind !== GcLabelKind.PREF &&
        prefByLang.get(l.language) === key(l.label)
      ) {
        throw new BadRequestException(
          `"${l.label}" is already the preferred label in "${l.language}"`,
        );
      }
    }
    for (const l of clean.filter((x) => x.kind === GcLabelKind.PREF)) {
      await this.assertPreferredLabelFree(
        manager,
        scheme,
        l.label,
        l.language,
        concept.id,
      );
    }

    const before = await manager.find(GcLabel, {
      where: { concept_id: concept.id },
    });
    await manager.delete(GcLabel, { concept_id: concept.id });
    if (clean.length)
      await manager.save(
        GcLabel,
        clean.map((l) => manager.create(GcLabel, l)),
      );
    await this.bumpIfPublished(manager, concept, actor);
    await this.log(
      manager,
      concept.id,
      GcHistoryAction.LABELS,
      null,
      null,
      actor,
      txId,
      {
        labels: {
          from: before.map(this.labelView),
          to: clean.map(this.labelView),
        },
      },
    );
  }

  /** Adds a broader or related link inside the scheme, checked at write time (V7–V9). */
  async addRelation(
    code: string,
    termId: number,
    dto: RelationDto,
    actor: GcActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const concept = await this.findConcept(manager, scheme, termId);
      const target = await this.findConcept(
        manager,
        scheme,
        dto.target_term_id,
      );
      await this.addRelationIn(manager, concept, target, dto.kind, actor);
      return (await this.presentAdmin(manager, scheme, [concept]))[0];
    });
  }

  async addRelationIn(
    manager: EntityManager,
    concept: GcConcept,
    target: GcConcept,
    kind: GcRelationKind,
    actor: GcActor,
    txId: string = randomUUID(),
  ) {
    const a = Number(concept.id);
    const b = Number(target.id);
    if (a === b)
      throw new BadRequestException('A concept cannot relate to itself');
    if (Number(concept.scheme_id) !== Number(target.scheme_id)) {
      throw new BadRequestException(
        'Relations stay inside one scheme; link another scheme with a mapping',
      );
    }
    const ancestorsOfA = await this.ancestors(manager, a);
    const ancestorsOfB = await this.ancestors(manager, b);
    if (kind === GcRelationKind.BROADER) {
      if (ancestorsOfB.has(a)) {
        throw new BadRequestException('This broader link would create a cycle');
      }
      if (await this.areRelated(manager, a, b)) {
        throw new BadRequestException(
          'Two related concepts cannot also be in the same hierarchy (SKOS S27)',
        );
      }
    } else if (ancestorsOfA.has(b) || ancestorsOfB.has(a)) {
      throw new BadRequestException(
        'A concept cannot be related to one of its ancestors or descendants (SKOS S27)',
      );
    }
    const [x, y] =
      kind === GcRelationKind.RELATED
        ? [Math.min(a, b), Math.max(a, b)]
        : [a, b];
    const exists = await manager.findOne(GcRelation, {
      where: { concept_id: x, related_concept_id: y, kind },
    });
    if (exists) return;
    await manager.save(
      GcRelation,
      manager.create(GcRelation, {
        concept_id: x,
        related_concept_id: y,
        kind,
      }),
    );
    await this.bumpIfPublished(manager, concept, actor);
    await this.log(
      manager,
      a,
      GcHistoryAction.RELATIONS,
      null,
      null,
      actor,
      txId,
      {
        [kind]: { from: null, to: Number(target.term_id) },
      },
    );
  }

  async removeRelation(
    code: string,
    termId: number,
    dto: RelationDto,
    actor: GcActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const concept = await this.findConcept(manager, scheme, termId);
      const target = await this.findConcept(
        manager,
        scheme,
        dto.target_term_id,
      );
      const a = Number(concept.id);
      const b = Number(target.id);
      const [x, y] =
        dto.kind === GcRelationKind.RELATED
          ? [Math.min(a, b), Math.max(a, b)]
          : [a, b];
      const res = await manager.delete(GcRelation, {
        concept_id: x,
        related_concept_id: y,
        kind: dto.kind,
      });
      if (!res.affected)
        throw new NotFoundException('That relation does not exist');
      await this.bumpIfPublished(manager, concept, actor);
      await this.log(
        manager,
        a,
        GcHistoryAction.RELATIONS,
        null,
        null,
        actor,
        randomUUID(),
        {
          [dto.kind]: { from: Number(target.term_id), to: null },
        },
      );
      return (await this.presentAdmin(manager, scheme, [concept]))[0];
    });
  }

  /** Adds or updates a manual mapping; `close` by default (exact is transitive). */
  async upsertMapping(
    code: string,
    termId: number,
    dto: MappingDto,
    actor: GcActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const concept = await this.findConcept(manager, scheme, termId);
      const match = dto.match_type ?? GcMatchType.CLOSE;
      const existing = await manager.findOne(GcMapping, {
        where: {
          concept_id: concept.id,
          target_uri: dto.target_uri,
          match_type: match,
        },
      });
      const mapping =
        existing ?? manager.create(GcMapping, { concept_id: concept.id });
      Object.assign(mapping, {
        target_scheme: norm(dto.target_scheme).toLowerCase(),
        target_uri: dto.target_uri.trim(),
        target_label: dto.target_label ? norm(dto.target_label) : null,
        match_type: match,
        justification: GcMappingJustification.MANUAL,
        author_email: existing?.author_email ?? actor.email,
        reviewed_by_email: actor.email,
        status: GcMappingStatus.APPROVED,
      });
      await manager.save(GcMapping, mapping);
      await this.bumpIfPublished(manager, concept, actor);
      await this.log(
        manager,
        concept.id,
        GcHistoryAction.MAPPINGS,
        null,
        null,
        actor,
        randomUUID(),
        {
          mapping: { from: null, to: `${match}:${mapping.target_uri}` },
        },
      );
      return (await this.presentAdmin(manager, scheme, [concept]))[0];
    });
  }

  async removeMapping(
    code: string,
    termId: number,
    mappingId: number,
    actor: GcActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const concept = await this.findConcept(manager, scheme, termId);
      const mapping = await manager.findOne(GcMapping, {
        where: { id: mappingId, concept_id: concept.id },
      });
      if (!mapping) throw new NotFoundException('That mapping does not exist');
      await manager.delete(GcMapping, { id: mapping.id });
      await this.bumpIfPublished(manager, concept, actor);
      await this.log(
        manager,
        concept.id,
        GcHistoryAction.MAPPINGS,
        null,
        null,
        actor,
        randomUUID(),
        {
          mapping: {
            from: `${mapping.match_type}:${mapping.target_uri}`,
            to: null,
          },
        },
      );
      return (await this.presentAdmin(manager, scheme, [concept]))[0];
    });
  }

  /**
   * Merges the concept in the path (source) into `into_term_id` (survivor),
   * one transaction (V12, V41): labels become alternative labels of the
   * survivor unless they duplicate one of its labels; relations and mappings
   * move without self-relations or duplicates; collection memberships and
   * icons move; open requests on the source are re-pointed; the source is
   * deprecated with the survivor as replacement. Both concepts are logged.
   */
  async merge(code: string, termId: number, dto: MergeDto, actor: GcActor) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.lockScheme(manager, code);
      const source = await this.findConcept(manager, scheme, termId);
      const target = await this.findConcept(manager, scheme, dto.into_term_id);
      await this.mergeIn(manager, scheme, source, target, actor);
      return (await this.presentAdmin(manager, scheme, [target]))[0];
    });
  }

  async mergeIn(
    manager: EntityManager,
    _scheme: GcScheme,
    source: GcConcept,
    target: GcConcept,
    actor: GcActor,
    txId: string = randomUUID(),
  ) {
    const s = Number(source.id);
    const t = Number(target.id);
    if (s === t)
      throw new BadRequestException('A concept cannot be merged into itself');
    if (target.status !== GcConceptStatus.APPROVED) {
      throw new BadRequestException('The surviving concept has to be approved');
    }
    await this.assertNoReplacementCycle(manager, source, target);

    // Labels: the source's preferred label and its labels become alternatives.
    const targetLabels = await manager.find(GcLabel, {
      where: { concept_id: t },
    });
    const taken = new Set([
      `${target.language}|${key(target.preferred_label)}`,
      ...targetLabels.map((l) => `${l.language}|${key(l.label)}`),
    ]);
    const sourceLabels = await manager.find(GcLabel, {
      where: { concept_id: s },
    });
    const incoming = [
      {
        label: source.preferred_label,
        language: source.language,
        kind: GcLabelKind.ALT,
        status: GcLabelStatus.ACTIVE,
      },
      ...sourceLabels.map((l) => ({
        label: l.label,
        language: l.language,
        kind: l.kind === GcLabelKind.PREF ? GcLabelKind.ALT : l.kind,
        status: l.status,
      })),
    ];
    for (const l of incoming) {
      const k = `${l.language}|${key(l.label)}`;
      if (taken.has(k)) continue;
      taken.add(k);
      await manager.save(
        GcLabel,
        manager.create(GcLabel, { ...l, concept_id: t }),
      );
    }
    await manager.delete(GcLabel, { concept_id: s });

    // Relations: re-point to the survivor, then drop self-links and duplicates.
    const rels = await manager.find(GcRelation, {
      where: [{ concept_id: s }, { related_concept_id: s }],
    });
    await manager.delete(GcRelation, {
      id: In(rels.map((r) => r.id).concat([-1])),
    });
    for (const r of rels) {
      let a = Number(r.concept_id) === s ? t : Number(r.concept_id);
      let b =
        Number(r.related_concept_id) === s ? t : Number(r.related_concept_id);
      if (a === b) continue;
      if (r.kind === GcRelationKind.RELATED && a > b) [a, b] = [b, a];
      const dup = await manager.findOne(GcRelation, {
        where: { concept_id: a, related_concept_id: b, kind: r.kind },
      });
      if (dup) continue;
      if (
        r.kind === GcRelationKind.BROADER &&
        (await this.ancestors(manager, b)).has(a)
      )
        continue;
      await manager.save(
        GcRelation,
        manager.create(GcRelation, {
          concept_id: a,
          related_concept_id: b,
          kind: r.kind,
        }),
      );
    }

    // Mappings, collections, icons: move without duplicates.
    for (const m of await manager.find(GcMapping, {
      where: { concept_id: s },
    })) {
      const dup = await manager.findOne(GcMapping, {
        where: {
          concept_id: t,
          target_uri: m.target_uri,
          match_type: m.match_type,
        },
      });
      if (dup) await manager.delete(GcMapping, { id: m.id });
      else await manager.update(GcMapping, { id: m.id }, { concept_id: t });
    }
    for (const cm of await manager.find(GcCollectionMember, {
      where: { concept_id: s },
    })) {
      const dup = await manager.findOne(GcCollectionMember, {
        where: { collection_id: cm.collection_id, concept_id: t },
      });
      if (dup) await manager.delete(GcCollectionMember, { id: cm.id });
      else
        await manager.update(
          GcCollectionMember,
          { id: cm.id },
          { concept_id: t },
        );
    }
    await manager.update(GcIcon, { concept_id: s }, { concept_id: t });
    await manager.update(
      GcProposal,
      {
        concept_id: s,
        state: In([
          GcProposalState.SUBMITTED,
          GcProposalState.IN_REVIEW,
          GcProposalState.CHANGES_REQUESTED,
          GcProposalState.VALIDATION,
        ]),
      },
      { concept_id: t },
    );
    // Concepts that were replaced by the source now point to the survivor.
    await manager.update(
      GcConcept,
      { replaced_by_id: s },
      { replaced_by_id: t },
    );

    const before = this.snapshot(source);
    source.status = GcConceptStatus.DEPRECATED;
    source.replaced_by_id = t;
    await this.finishWrite(
      manager,
      source,
      before,
      actor,
      txId,
      GcHistoryAction.MERGE,
      {
        merged_into: { from: null, to: Number(target.term_id) },
      },
    );
    await this.bumpIfPublished(manager, target, actor);
    await this.log(manager, t, GcHistoryAction.MERGE, null, null, actor, txId, {
      merged_from: { from: null, to: Number(source.term_id) },
    });
  }

  // ---------------------------------------------------------------- helpers

  /** Locks the scheme row: serialises term-id allocation and graph checks (V3). */
  async lockScheme(manager: EntityManager, code: string): Promise<GcScheme> {
    const scheme = await manager
      .createQueryBuilder(GcScheme, 's')
      .setLock('pessimistic_write')
      .where('s.code = :code', { code: (code ?? '').toLowerCase() })
      .getOne();
    if (!scheme)
      throw new NotFoundException(`Concept scheme "${code}" was not found`);
    return scheme;
  }

  async findConcept(manager: EntityManager, scheme: GcScheme, termId: number) {
    const concept = await manager.findOne(GcConcept, {
      where: { scheme_id: scheme.id, term_id: Number(termId) },
    });
    if (!concept) {
      throw new NotFoundException(
        `Concept ${scheme.code}/${termId} was not found`,
      );
    }
    return concept;
  }

  /** Keeps a requested term id when free; otherwise the next one. Caller holds the lock. */
  private async allocateTermId(
    manager: EntityManager,
    scheme: GcScheme,
    wanted?: number,
  ) {
    let termId: number;
    if (wanted) {
      const taken = await manager.findOne(GcConcept, {
        where: { scheme_id: scheme.id, term_id: wanted },
      });
      if (taken) {
        throw new ConflictException(
          `term_id ${wanted} is already used in "${scheme.code}"`,
        );
      }
      termId = wanted;
    } else {
      termId = Number(scheme.next_term_id);
      while (
        await manager.findOne(GcConcept, {
          where: { scheme_id: scheme.id, term_id: termId },
        })
      ) {
        termId++;
      }
    }
    const next = Math.max(Number(scheme.next_term_id), termId + 1);
    if (next !== Number(scheme.next_term_id)) {
      scheme.next_term_id = next;
      await manager.update(GcScheme, { id: scheme.id }, { next_term_id: next });
    }
    return termId;
  }

  /** Active list values by list code; each accepts its value or its label. */
  async loadLists(manager: EntityManager, scheme: GcScheme) {
    const rows = await manager.find(GcListValue, {
      where: { scope: In(['', scheme.code]), is_active: true },
    });
    const lists = new Map<string, Map<string, string>>();
    for (const r of rows) {
      const m = lists.get(r.list_code) ?? new Map<string, string>();
      m.set(key(r.value), r.value);
      m.set(key(r.label), r.value);
      lists.set(r.list_code, m);
    }
    return lists;
  }

  /**
   * Copies the DTO fields that are present, normalised. `''` clears a text
   * field; list-driven fields must match an active value (or its label) of
   * their list and are stored as the list value.
   */
  private cleanFields(
    dto: ConceptFieldsDto,
    lists: Map<string, Map<string, string>>,
  ) {
    const out: Record<string, unknown> = {};
    for (const field of WRITABLE_FIELDS) {
      const value = (dto as Record<string, unknown>)[field];
      if (value === undefined) continue;
      const listCode = LIST_FIELDS[field];
      if (Array.isArray(value)) {
        const items = value.map((v) => norm(String(v))).filter(Boolean);
        out[field] = listCode
          ? items.map((v) => this.listValue(lists, listCode, v, field))
          : [...new Set(items)];
      } else if (value === null || value === '') {
        out[field] = null;
      } else if (typeof value === 'string') {
        const text =
          field === 'definition' ||
          field === 'scope_note' ||
          field === 'example_of_use' ||
          field === 'notes' ||
          field === 'source_citation' ||
          field === 'rights_note'
            ? value.trim()
            : norm(value);
        out[field] = listCode
          ? this.listValue(lists, listCode, text, field)
          : text || null;
      } else {
        out[field] = value;
      }
    }
    if (Array.isArray(out.meliaf_function))
      out.meliaf_function = [...new Set(out.meliaf_function as string[])];
    if (Array.isArray(out.meliaf_phase_also))
      out.meliaf_phase_also = [...new Set(out.meliaf_phase_also as string[])];
    if (out.language) out.language = String(out.language).toLowerCase();
    return out;
  }

  private listValue(
    lists: Map<string, Map<string, string>>,
    listCode: string,
    raw: string,
    field: string,
  ) {
    const list = lists.get(listCode);
    if (!list) return raw;
    const value = list.get(key(raw));
    if (!value) {
      throw new BadRequestException(
        `"${raw}" is not a value of the ${listCode} list (field ${field})`,
      );
    }
    return value;
  }

  /** One preferred label per language in a scheme, among live concepts (S14). */
  private async assertPreferredLabelFree(
    manager: EntityManager,
    scheme: GcScheme,
    label: string,
    language: string,
    exceptConceptId?: number,
  ) {
    const clash = await manager
      .createQueryBuilder(GcConcept, 'c')
      .where('c.scheme_id = :s', { s: scheme.id })
      .andWhere('LOWER(c.preferred_label) = :l', { l: key(label) })
      .andWhere('c.language = :lang', { lang: language })
      .andWhere('c.status <> :dep', { dep: GcConceptStatus.DEPRECATED })
      .andWhere(exceptConceptId ? 'c.id <> :id' : '1=1', {
        id: exceptConceptId,
      })
      .getOne();
    const labelClash = await manager
      .createQueryBuilder(GcLabel, 'l')
      .innerJoin(GcConcept, 'c', 'c.id = l.concept_id')
      .where('c.scheme_id = :s', { s: scheme.id })
      .andWhere('l.kind = :pref', { pref: GcLabelKind.PREF })
      .andWhere('LOWER(l.label) = :l', { l: key(label) })
      .andWhere('l.language = :lang', { lang: language })
      .andWhere('c.status <> :dep', { dep: GcConceptStatus.DEPRECATED })
      .andWhere(exceptConceptId ? 'c.id <> :id' : '1=1', {
        id: exceptConceptId,
      })
      .getOne();
    const hit = clash ?? labelClash;
    if (hit) {
      throw new ConflictException(
        `"${label}" is already the preferred label (${language}) of another concept in "${scheme.code}"`,
      );
    }
  }

  /** After a rename: the new preferred label must not also be one of the concept's own labels (S13). */
  private async assertNoOwnLabelClash(
    manager: EntityManager,
    concept: GcConcept,
  ) {
    const own = await manager.find(GcLabel, {
      where: { concept_id: concept.id, language: concept.language },
    });
    if (own.some((l) => key(l.label) === key(concept.preferred_label))) {
      throw new BadRequestException(
        `"${concept.preferred_label}" is already one of this concept's other labels; remove it first`,
      );
    }
  }

  /** Walks broader links upward from a concept; returns every ancestor id. */
  private async ancestors(manager: EntityManager, conceptId: number) {
    const out = new Set<number>();
    let frontier = [conceptId];
    for (let depth = 0; frontier.length && depth < 64; depth++) {
      const rows = await manager.find(GcRelation, {
        where: { concept_id: In(frontier), kind: GcRelationKind.BROADER },
      });
      frontier = [];
      for (const r of rows) {
        const p = Number(r.related_concept_id);
        if (!out.has(p)) {
          out.add(p);
          frontier.push(p);
        }
      }
    }
    return out;
  }

  private async areRelated(manager: EntityManager, a: number, b: number) {
    const [x, y] = [Math.min(a, b), Math.max(a, b)];
    return !!(await manager.findOne(GcRelation, {
      where: {
        concept_id: x,
        related_concept_id: y,
        kind: GcRelationKind.RELATED,
      },
    }));
  }

  /** The replacement chain starting at `replacement` must never lead back to `concept` (V11). */
  private async assertNoReplacementCycle(
    manager: EntityManager,
    concept: GcConcept,
    replacement: GcConcept,
  ) {
    let current: GcConcept | null = replacement;
    for (let i = 0; current && i < 64; i++) {
      if (Number(current.id) === Number(concept.id)) {
        throw new BadRequestException(
          'That replacement would create a replacement cycle',
        );
      }
      current = current.replaced_by_id
        ? await manager.findOne(GcConcept, {
            where: { id: current.replaced_by_id },
          })
        : null;
    }
  }

  /** Saves, bumps the version of a published concept when a versioned field changed, and logs the diff. */
  private async finishWrite(
    manager: EntityManager,
    concept: GcConcept,
    before: Record<string, unknown>,
    actor: GcActor,
    txId: string,
    defaultAction: GcHistoryAction,
    extraChanges: Record<string, GcFieldChange> = {},
  ) {
    const after = this.snapshot(concept);
    const versioned = VERSIONED_FIELDS.some(
      (f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]),
    );
    const changed = Object.keys(after).some(
      (f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]),
    );
    if (!changed && !Object.keys(extraChanges).length) return;
    if (
      versioned &&
      GC_PUBLIC_STATUSES.includes(before.status as GcConceptStatus)
    ) {
      concept.version = this.bumpMinor(concept.version);
    }
    concept.date_modified = new Date().toISOString().slice(0, 10);
    concept.updated_by_email = actor.email;
    await manager.save(GcConcept, concept);
    await this.log(
      manager,
      concept.id,
      actor.action ?? defaultAction,
      before,
      this.snapshot(concept),
      actor,
      txId,
      extraChanges,
    );
  }

  /** Label, relation and mapping changes also revise a published concept (V22). */
  private async bumpIfPublished(
    manager: EntityManager,
    concept: GcConcept,
    actor: GcActor,
  ) {
    concept.date_modified = new Date().toISOString().slice(0, 10);
    concept.updated_by_email = actor.email;
    if (GC_PUBLIC_STATUSES.includes(concept.status)) {
      concept.version = this.bumpMinor(concept.version);
    }
    await manager.save(GcConcept, concept);
  }

  bumpMinor(version: string) {
    const [major, minor] = (version || '1.0')
      .split('.')
      .map((n) => Number(n) || 0);
    return `${major || 1}.${minor + 1}`;
  }

  private async log(
    manager: EntityManager,
    conceptId: number,
    action: GcHistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    actor: GcActor,
    txId: string,
    extra: Record<string, GcFieldChange> = {},
  ) {
    const changes: Record<string, GcFieldChange> = { ...extra };
    if (after) {
      for (const [field, to] of Object.entries(after)) {
        const from = before ? before[field] : null;
        if (
          JSON.stringify(from) !== JSON.stringify(to) &&
          !(
            before === null &&
            (to === null || (Array.isArray(to) && !to.length))
          )
        ) {
          changes[field] = { from, to };
        }
      }
    }
    await manager.save(
      GcHistory,
      manager.create(GcHistory, {
        concept_id: Number(conceptId),
        action,
        changes,
        changed_by_email: actor.email,
        tx_id: txId,
        proposal_id: actor.proposalId ?? null,
      }),
    );
  }

  private snapshot(c: GcConcept): Record<string, unknown> {
    const out: Record<string, unknown> = {
      preferred_label: c.preferred_label,
      status: c.status,
      replaced_by_id: c.replaced_by_id ?? null,
    };
    for (const f of WRITABLE_FIELDS) {
      const v = (c as unknown as Record<string, unknown>)[f];
      out[f] = v === undefined ? null : v;
    }
    return out;
  }

  private labelView = (l: Partial<GcLabel>) =>
    `${l.kind}:${l.language}:${l.label}${l.status === GcLabelStatus.DISCOURAGED ? ' (discouraged)' : ''}`;

  /** Public shape + the internal fields the panel needs (never exposed publicly). */
  private async presentAdmin(
    manager: EntityManager,
    scheme: GcScheme,
    concepts: GcConcept[],
  ) {
    const graph = await this.loader.load(manager, scheme, concepts);
    const publicShape = presentConcepts(graph, () => true);
    const byTerm = new Map(concepts.map((c) => [Number(c.term_id), c]));
    return publicShape.map((p) => {
      const c = byTerm.get(p.term_id);
      return {
        ...p,
        notes: c?.notes ?? null,
        created_by_email: c?.created_by_email ?? null,
        updated_by_email: c?.updated_by_email ?? null,
        mappings_all: graph.mappings
          .filter((m) => Number(m.concept_id) === Number(c?.id))
          .map((m) => ({
            id: Number(m.id),
            ...m,
            confidence: m.confidence === null ? null : Number(m.confidence),
          })),
      };
    });
  }
}

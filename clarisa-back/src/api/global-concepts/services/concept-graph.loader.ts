import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import {
  GcCollection,
  GcCollectionMember,
} from '../entities/gc-collection.entity';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcField, GcFieldType } from '../entities/gc-field.entity';
import { GcIcon } from '../entities/gc-icon.entity';
import { GcLabel } from '../entities/gc-label.entity';
import { GcMapping } from '../entities/gc-mapping.entity';
import { GcRelation } from '../entities/gc-relation.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { ConceptGraph } from '../utils/concept-presenter';

/**
 * Loads a set of concepts with everything the presenter needs in a fixed
 * number of bulk queries (labels, relations, mappings, icons, field
 * definitions, referenced and term-linked concepts), whatever the size of the
 * set — never one query per concept.
 */
@Injectable()
export class ConceptGraphLoader {
  async scheme(manager: EntityManager, code: string): Promise<GcScheme> {
    const scheme = await manager.findOne(GcScheme, {
      where: { code: (code ?? '').toLowerCase() },
    });
    if (!scheme) {
      throw new NotFoundException(`Concept scheme "${code}" was not found`);
    }
    return scheme;
  }

  async load(
    manager: EntityManager,
    scheme: GcScheme,
    concepts: GcConcept[],
  ): Promise<ConceptGraph> {
    const ids = concepts.map((c) => Number(c.id));
    if (!ids.length) {
      return {
        scheme,
        concepts,
        labels: [],
        relations: [],
        mappings: [],
        referenced: [],
        icons: [],
        fields: [],
        linked: [],
        collections: [],
        collectionMembers: [],
      };
    }
    const [labels, relationsA, relationsB, mappings, icons, fields, members] =
      await Promise.all([
        manager.find(GcLabel, { where: { concept_id: In(ids) } }),
        manager.find(GcRelation, { where: { concept_id: In(ids) } }),
        manager.find(GcRelation, { where: { related_concept_id: In(ids) } }),
        manager.find(GcMapping, { where: { concept_id: In(ids) } }),
        manager.find(GcIcon, { where: { concept_id: In(ids) } }),
        this.fields(manager, scheme),
        manager.find(GcCollectionMember, { where: { concept_id: In(ids) } }),
      ]);
    const collectionIds = [
      ...new Set(members.map((m) => Number(m.collection_id))),
    ];
    const collections = collectionIds.length
      ? await manager.find(GcCollection, { where: { id: In(collectionIds) } })
      : [];
    const seen = new Set<number>();
    const relations = [...relationsA, ...relationsB].filter((r) => {
      if (seen.has(Number(r.id))) return false;
      seen.add(Number(r.id));
      return true;
    });
    const known = new Set(ids);
    const refIds = new Set<number>();
    for (const r of relations) {
      for (const x of [Number(r.concept_id), Number(r.related_concept_id)]) {
        if (!known.has(x)) refIds.add(x);
      }
    }
    for (const c of concepts) {
      if (c.replaced_by_id && !known.has(Number(c.replaced_by_id))) {
        refIds.add(Number(c.replaced_by_id));
      }
    }
    const referenced = refIds.size
      ? await manager.find(GcConcept, { where: { id: In([...refIds]) } })
      : [];
    // term_link values store term_ids of the same scheme.
    const knownTerms = new Set(concepts.map((c) => Number(c.term_id)));
    const linkIds = new Set<number>();
    for (const f of fields.filter((x) => x.type === GcFieldType.TERM_LINK)) {
      for (const c of concepts) {
        const v = (c.extra ?? {})[f.code];
        for (const t of Array.isArray(v) ? v : []) {
          if (!knownTerms.has(Number(t))) linkIds.add(Number(t));
        }
      }
    }
    const linked = linkIds.size
      ? await manager.find(GcConcept, {
          where: { scheme_id: scheme.id, term_id: In([...linkIds]) },
        })
      : [];
    return {
      scheme,
      concepts,
      labels,
      relations,
      mappings,
      referenced,
      icons,
      fields,
      linked,
      collections,
      collectionMembers: members,
    };
  }

  /** Active custom field definitions of a scheme, in display order. */
  async fields(manager: EntityManager, scheme: GcScheme): Promise<GcField[]> {
    return manager.find(GcField, {
      where: { scheme_id: scheme.id, is_active: true },
      order: { sort: 'ASC' },
    });
  }
}

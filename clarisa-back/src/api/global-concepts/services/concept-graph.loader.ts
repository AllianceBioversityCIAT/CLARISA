import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcLabel } from '../entities/gc-label.entity';
import { GcMapping } from '../entities/gc-mapping.entity';
import { GcRelation } from '../entities/gc-relation.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { ConceptGraph } from '../utils/concept-presenter';

/**
 * Loads a set of concepts with everything the presenter needs in four bulk
 * queries (labels, relations, mappings, referenced concepts), whatever the
 * size of the set — never one query per concept.
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
      };
    }
    const [labels, relationsA, relationsB, mappings] = await Promise.all([
      manager.find(GcLabel, { where: { concept_id: In(ids) } }),
      manager.find(GcRelation, { where: { concept_id: In(ids) } }),
      manager.find(GcRelation, { where: { related_concept_id: In(ids) } }),
      manager.find(GcMapping, { where: { concept_id: In(ids) } }),
    ]);
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
    return { scheme, concepts, labels, relations, mappings, referenced };
  }
}

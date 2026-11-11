import { ConflictException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import {
  GcCollection,
  GcCollectionMember,
} from '../entities/gc-collection.entity';
import { GLOSSARY_COLLECTION_CODE } from '../global-concepts.config';

/**
 * The one lock between the taxonomy write paths and the glossary (2026-11-11).
 *
 * Since the single-table cutover, the concepts of the `glossary` collection
 * are what `GET api/glossary` (v1) serves. Their only legitimate writer is
 * `GlossaryStore` (raw SQL, never these helpers) plus the migrations; every
 * taxonomy write path (admin, import, requests, platform API keys) calls the
 * functions below before writing, and answers 409 instead of changing a
 * glossary term or the collection itself.
 */
export const GLOSSARY_LOCK_MESSAGE =
  'Glossary terms are managed from the Glossary panel.';

/** True for the code of the collection that holds the glossary. */
export const isGlossaryCollectionCode = (code: string | null | undefined) =>
  (code ?? '').trim().toLowerCase() === GLOSSARY_COLLECTION_CODE;

/** 409 when a write targets the glossary collection (create, rename, members, delete). */
export function assertNotGlossaryCollection(code: string | null | undefined) {
  if (isGlossaryCollectionCode(code)) {
    throw new ConflictException(
      `The "${GLOSSARY_COLLECTION_CODE}" collection holds the glossary. ${GLOSSARY_LOCK_MESSAGE}`,
    );
  }
}

/** Internal ids, among `conceptIds`, of the concepts that belong to the glossary collection. */
export async function glossaryConceptIds(
  manager: EntityManager,
  conceptIds: (number | string | null | undefined)[],
): Promise<Set<number>> {
  const ids = [
    ...new Set(
      conceptIds
        .filter((id) => id !== null && id !== undefined)
        .map((id) => Number(id)),
    ),
  ];
  if (!ids.length) return new Set();
  const collections = await manager.find(GcCollection, {
    where: { code: GLOSSARY_COLLECTION_CODE },
  });
  if (!collections.length) return new Set();
  const members = await manager.find(GcCollectionMember, {
    where: {
      collection_id: In(collections.map((c) => Number(c.id))),
      concept_id: In(ids),
    },
  });
  return new Set(members.map((m) => Number(m.concept_id)));
}

/**
 * 409 when any of the concepts belongs to the glossary collection. Runs
 * before the first write of the caller, so nothing is half-written.
 */
export async function assertNotGlossaryConcepts(
  manager: EntityManager,
  concepts: ({ id: number; term_id: number } | null | undefined)[],
) {
  const present = concepts.filter(
    (c): c is { id: number; term_id: number } => !!c,
  );
  const hit = await glossaryConceptIds(
    manager,
    present.map((c) => c.id),
  );
  if (!hit.size) return;
  const terms = [
    ...new Set(
      present
        .filter((c) => hit.has(Number(c.id)))
        .map((c) => Number(c.term_id)),
    ),
  ];
  throw new ConflictException(
    `${terms.length > 1 ? 'Terms' : 'Term'} ${terms.join(', ')} ${
      terms.length > 1 ? 'belong' : 'belongs'
    } to the glossary. ${GLOSSARY_LOCK_MESSAGE}`,
  );
}

/** Text of the import row error for a row that matches a glossary term. */
export const glossaryImportRowError = (termId: number) =>
  `Term ${termId} belongs to the glossary. ${GLOSSARY_LOCK_MESSAGE}`;

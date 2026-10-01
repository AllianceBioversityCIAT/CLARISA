import {
  GcCollection,
  GcCollectionMember,
} from '../entities/gc-collection.entity';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcField, GcFieldType } from '../entities/gc-field.entity';
import { GcIcon } from '../entities/gc-icon.entity';
import {
  GcLabel,
  GcLabelKind,
  GcLabelStatus,
} from '../entities/gc-label.entity';
import { GcMapping, GcMappingStatus } from '../entities/gc-mapping.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { conceptUri } from '../global-concepts.config';
import { PublicCustomField, isHttpUrl, publicFields } from './custom-fields';

/** A label as published: language-tagged, with its kind and status. */
export interface PublicLabel {
  label: string;
  language: string;
  kind: GcLabelKind;
  discouraged: boolean;
}

export interface PublicConceptRef {
  term_id: number;
  uri: string;
  preferred_label: string;
}

export interface PublicMapping {
  target_scheme: string;
  target_uri: string;
  target_label: string | null;
  match_type: string;
  justification: string;
  confidence: number | null;
}

/**
 * An icon as published. `url` is the primary link only when it is http(s):
 * a network path or a file name typed by hand is not something a reader can
 * open, and it must never become an `<img src>` or an RDF IRI.
 */
export interface PublicIcon {
  icon_code: string | null;
  status: string | null;
  format: string | null;
  alt_text: string | null;
  url: string | null;
  rights_and_licence: string | null;
  designer: string | null;
}

/**
 * The public shape of a concept. Field names follow the concepts data schema
 * template so an export round-trips into the same Excel. Internal ids,
 * editor emails and the internal `notes` never appear here.
 */
export interface PublicConcept {
  scheme: string;
  term_id: number;
  term_uri: string;
  preferred_label: string;
  language: string;
  preferred_labels: { label: string; language: string }[];
  alternative_labels: PublicLabel[];
  definition: string | null;
  short_definition: string | null;
  scope_note: string | null;
  example_of_use: string | null;
  term_type: string | null;
  functions: string[];
  phase_primary: string | null;
  phase_also: string[];
  broader_terms: PublicConceptRef[];
  narrower_terms: PublicConceptRef[];
  related_terms: PublicConceptRef[];
  source_citation: string | null;
  source_url: string | null;
  derivation: string | null;
  origin: string | null;
  ai_generated_fields: string[];
  status: string;
  version: string;
  date_created: string | null;
  date_modified: string | null;
  validated_by: string[];
  date_validated: string | null;
  steward: string | null;
  replaced_by: PublicConceptRef | null;
  rights_note: string | null;
  mappings: PublicMapping[];
  icons: PublicIcon[];
  /** Curated subsets the concept belongs to, e.g. "Core terms". */
  collections: { code: string; label: string }[];
  /** Active + public custom fields only; the raw `extra` is admin-only. */
  custom_fields: PublicCustomField[];
}

/** Everything the presenter needs, loaded in bulk by the caller (no N+1). */
export interface ConceptGraph {
  scheme: GcScheme;
  concepts: GcConcept[];
  labels: GcLabel[];
  relations: GcRelation[];
  mappings: GcMapping[];
  /** Concepts referenced by relations / replacements that may not be in `concepts`. */
  referenced?: GcConcept[];
  /** Icons of `concepts`. Optional: a graph built before icons existed still presents. */
  icons?: GcIcon[];
  /** Active custom field definitions of the scheme. */
  fields?: GcField[];
  /** Concepts named by `term_link` values that may not be in `concepts`. */
  linked?: GcConcept[];
  /** Collections the concepts belong to (the public list filters by them). */
  collections?: GcCollection[];
  collectionMembers?: GcCollectionMember[];
}

export const presentIcon = (i: GcIcon): PublicIcon => ({
  icon_code: i.icon_code ?? null,
  status: i.icon_status ?? null,
  format: i.file_format ?? null,
  alt_text: i.alt_text ?? null,
  url:
    i.file_link_primary && isHttpUrl(i.file_link_primary)
      ? i.file_link_primary
      : null,
  rights_and_licence: i.rights_and_licence ?? null,
  designer: i.designer ?? null,
});

const day = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  return typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
};

/**
 * Builds public concepts from one scheme's rows. Relations are read in both
 * directions: `broader` rows give broader terms to the child and narrower
 * terms to the parent; `related` rows are symmetric (V8). References to
 * concepts that are not public are dropped, so a draft never leaks through a
 * relation of a published concept.
 */
export function presentConcepts(
  graph: ConceptGraph,
  isPublic: (concept: GcConcept) => boolean,
): PublicConcept[] {
  const byId = new Map<number, GcConcept>();
  for (const c of [...(graph.referenced ?? []), ...graph.concepts]) {
    byId.set(Number(c.id), c);
  }
  const byTermId = new Map<number, GcConcept>();
  for (const c of [...(graph.linked ?? []), ...graph.concepts]) {
    if (Number(c.scheme_id) === Number(graph.scheme.id))
      byTermId.set(Number(c.term_id), c);
  }
  const ref = (id: number | null | undefined): PublicConceptRef | null => {
    if (id === null || id === undefined) return null;
    const c = byId.get(Number(id));
    if (!c || !isPublic(c)) return null;
    return {
      term_id: Number(c.term_id),
      uri: conceptUri(graph.scheme, Number(c.term_id)),
      preferred_label: c.preferred_label,
    };
  };

  const labelsOf = new Map<number, GcLabel[]>();
  for (const l of graph.labels) {
    const k = Number(l.concept_id);
    labelsOf.set(k, [...(labelsOf.get(k) ?? []), l]);
  }
  const mappingsOf = new Map<number, GcMapping[]>();
  for (const m of graph.mappings) {
    if (m.status !== GcMappingStatus.APPROVED) continue;
    const k = Number(m.concept_id);
    mappingsOf.set(k, [...(mappingsOf.get(k) ?? []), m]);
  }
  const broader = new Map<number, number[]>();
  const narrower = new Map<number, number[]>();
  const related = new Map<number, number[]>();
  const push = (map: Map<number, number[]>, k: number, v: number) =>
    map.set(k, [...(map.get(k) ?? []), v]);
  for (const r of graph.relations) {
    const a = Number(r.concept_id);
    const b = Number(r.related_concept_id);
    if (r.kind === GcRelationKind.BROADER) {
      push(broader, a, b);
      push(narrower, b, a);
    } else {
      push(related, a, b);
      push(related, b, a);
    }
  }
  const iconsOf = new Map<number, GcIcon[]>();
  const collectionById = new Map(
    (graph.collections ?? []).map((k) => [Number(k.id), k]),
  );
  const collectionsOf = new Map<number, GcCollection[]>();
  for (const m of graph.collectionMembers ?? []) {
    const k = collectionById.get(Number(m.collection_id));
    if (!k) continue;
    const list = collectionsOf.get(Number(m.concept_id)) ?? [];
    list.push(k);
    collectionsOf.set(Number(m.concept_id), list);
  }
  for (const i of [...(graph.icons ?? [])].sort(
    (a, b) => Number(a.id) - Number(b.id),
  )) {
    const k = Number(i.concept_id);
    iconsOf.set(k, [...(iconsOf.get(k) ?? []), i]);
  }
  const shownFields = publicFields(graph.fields);
  // A term_link value is published like a relation: only to public concepts.
  const termLink = (termId: unknown) => {
    const c = byTermId.get(Number(termId));
    if (!c || !isPublic(c)) return null;
    return {
      term_id: Number(c.term_id),
      preferred_label: c.preferred_label,
      uri: conceptUri(graph.scheme, Number(c.term_id)),
    };
  };
  const customFields = (c: GcConcept): PublicCustomField[] =>
    shownFields.map((f) => {
      const raw = (c.extra ?? {})[f.code];
      let value: unknown = raw === undefined ? null : raw;
      if (f.type === GcFieldType.TERM_LINK) {
        value = (Array.isArray(raw) ? raw : raw == null ? [] : [raw])
          .map(termLink)
          .filter((x) => x !== null);
      }
      return { code: f.code, label: f.label, type: f.type, value };
    });

  const refs = (ids: number[] | undefined) =>
    (ids ?? [])
      .map((id) => ref(id))
      .filter((r): r is PublicConceptRef => r !== null)
      .sort((x, y) => x.preferred_label.localeCompare(y.preferred_label));

  return graph.concepts.filter(isPublic).map((c) => {
    const id = Number(c.id);
    const labels = labelsOf.get(id) ?? [];
    return {
      scheme: graph.scheme.code,
      term_id: Number(c.term_id),
      term_uri: conceptUri(graph.scheme, Number(c.term_id)),
      preferred_label: c.preferred_label,
      language: c.language,
      preferred_labels: [
        { label: c.preferred_label, language: c.language },
        ...labels
          .filter((l) => l.kind === GcLabelKind.PREF)
          .map((l) => ({ label: l.label, language: l.language })),
      ],
      alternative_labels: labels
        .filter((l) => l.kind !== GcLabelKind.PREF)
        .map((l) => ({
          label: l.label,
          language: l.language,
          kind: l.kind,
          discouraged: l.status === GcLabelStatus.DISCOURAGED,
        })),
      definition: c.definition,
      short_definition: c.short_definition,
      scope_note: c.scope_note,
      example_of_use: c.example_of_use,
      term_type: c.term_type,
      functions: c.functions ?? [],
      phase_primary: c.phase_primary,
      phase_also: c.phase_also ?? [],
      broader_terms: refs(broader.get(id)),
      narrower_terms: refs(narrower.get(id)),
      related_terms: refs(related.get(id)),
      source_citation: c.source_citation,
      source_url: c.source_url,
      derivation: c.derivation,
      origin: c.origin,
      ai_generated_fields: c.ai_generated_fields ?? [],
      status: c.status,
      version: c.version,
      date_created: day(c.date_created),
      date_modified: day(c.date_modified),
      validated_by: c.validated_by ?? [],
      date_validated: day(c.date_validated),
      steward: c.steward,
      replaced_by: ref(c.replaced_by_id),
      rights_note: c.rights_note,
      mappings: (mappingsOf.get(id) ?? []).map((m) => ({
        target_scheme: m.target_scheme,
        target_uri: m.target_uri,
        target_label: m.target_label,
        match_type: m.match_type,
        justification: m.justification,
        confidence: m.confidence === null ? null : Number(m.confidence),
      })),
      icons: (iconsOf.get(id) ?? []).map(presentIcon),
      collections: (collectionsOf.get(id) ?? []).map((k) => ({
        code: k.code,
        label: k.label,
      })),
      custom_fields: customFields(c),
    };
  });
}

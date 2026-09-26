import { GcConcept } from '../entities/gc-concept.entity';
import {
  GcLabel,
  GcLabelKind,
  GcLabelStatus,
} from '../entities/gc-label.entity';
import { GcMapping, GcMappingStatus } from '../entities/gc-mapping.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { conceptUri } from '../global-concepts.config';

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
 * The public shape of a concept. Field names follow the MELIAF data schema
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
  meliaf_function: string[];
  meliaf_phase_primary: string | null;
  meliaf_phase_also: string[];
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
  extra: Record<string, unknown>;
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
}

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
      meliaf_function: c.meliaf_function ?? [],
      meliaf_phase_primary: c.meliaf_phase_primary,
      meliaf_phase_also: c.meliaf_phase_also ?? [],
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
      extra: c.extra ?? {},
    };
  });
}

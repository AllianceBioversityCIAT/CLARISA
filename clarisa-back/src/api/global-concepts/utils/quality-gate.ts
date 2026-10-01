import {
  GC_PUBLIC_STATUSES,
  GcConcept,
  GcConceptStatus,
} from '../entities/gc-concept.entity';
import { GcLabel, GcLabelKind } from '../entities/gc-label.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';

export type QualitySeverity = 'error' | 'warning';

export enum QualityCode {
  /** SKOS S14: one preferred label per language, unique across the scheme. */
  DUPLICATE_PREF_LABEL = 'S14_duplicate_pref_label',
  /** SKOS S13: preferred, alternative and hidden labels are disjoint. */
  LABEL_OVERLAP = 'S13_label_overlap',
  /** SKOS S27: `related` is disjoint with the transitive `broader`. */
  RELATED_TO_ANCESTOR = 'S27_related_to_ancestor',
  BROADER_CYCLE = 'broader_cycle',
  MISSING_DEFINITION = 'missing_definition',
  DEPRECATED_WITHOUT_REPLACEMENT = 'deprecated_without_replacement',
  RELATION_OUTSIDE_SCHEME = 'relation_outside_scheme',
  ONLY_DEPRECATED_BROADER = 'only_deprecated_broader',
  REPLACED_BY_NOT_APPROVED = 'replaced_by_not_approved',
}

export interface QualityIssue {
  code: QualityCode;
  severity: QualitySeverity;
  term_id: number;
  message: string;
}

const norm = (text: string) => (text ?? '').trim().toLowerCase();

/**
 * Deterministic checks run before every release (design D10). They look only
 * at what a release would publish — approved and deprecated concepts — so a
 * half-written draft never blocks shipping the rest of the scheme. Errors
 * block the release; warnings are reported and let it through.
 *
 * `concepts` are the concepts of ONE scheme (any status); `labels` and
 * `relations` are the rows attached to them. A relation end that is not in
 * `concepts` belongs to another scheme (or to nothing): relations never cross
 * schemes, that is what mappings are for (V7).
 *
 * The output is sorted (term_id, code, message) so two runs over the same
 * data produce the same report, and a diff between reports means a change.
 */
export function checkQuality(
  concepts: GcConcept[],
  labels: GcLabel[],
  relations: GcRelation[],
  defaultLanguage: string,
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const add = (
    code: QualityCode,
    severity: QualitySeverity,
    termId: number,
    message: string,
  ) => issues.push({ code, severity, term_id: termId, message });

  const byId = new Map<number, GcConcept>();
  for (const c of concepts) byId.set(Number(c.id), c);
  const isPublished = (c: GcConcept | undefined) =>
    !!c && GC_PUBLIC_STATUSES.includes(c.status);
  const published = concepts.filter(isPublished);
  const publishedIds = new Set(published.map((c) => Number(c.id)));
  const termOf = (id: number) => Number(byId.get(id)?.term_id);
  const schemeIds = new Set(concepts.map((c) => Number(c.scheme_id)));

  const labelsOf = new Map<number, GcLabel[]>();
  for (const l of labels) {
    const k = Number(l.concept_id);
    labelsOf.set(k, [...(labelsOf.get(k) ?? []), l]);
  }

  // ------------------------------------------------------------ labels

  // Every preferred label of every published concept, per language. The
  // default-language one lives on the concept row; the rest are `pref` rows
  // (V4), so a `pref` row in the concept's own language is a second
  // preferred label inside one concept.
  const prefIndex = new Map<string, number[]>();
  for (const c of published) {
    const id = Number(c.id);
    const own = (c.language || defaultLanguage).toLowerCase();
    const prefs: { label: string; language: string }[] = [
      { label: c.preferred_label, language: own },
      ...(labelsOf.get(id) ?? [])
        .filter((l) => l.kind === GcLabelKind.PREF)
        .map((l) => ({
          label: l.label,
          language: (l.language || defaultLanguage).toLowerCase(),
        })),
    ];

    const perLanguage = new Map<string, number>();
    for (const p of prefs) {
      perLanguage.set(p.language, (perLanguage.get(p.language) ?? 0) + 1);
      const key = `${p.language}\u0000${norm(p.label)}`;
      prefIndex.set(key, [...(prefIndex.get(key) ?? []), id]);
    }
    for (const [language, count] of perLanguage) {
      if (count > 1) {
        add(
          QualityCode.DUPLICATE_PREF_LABEL,
          'error',
          Number(c.term_id),
          `Has ${count} preferred labels in "${language}"; SKOS allows one per language`,
        );
      }
    }

    // S13: the same text (case-insensitive, same language) under two
    // different kinds — e.g. an alt label equal to the preferred label, or a
    // label that is both alt and hidden. A consumer could not tell which
    // role it plays.
    const kindsOf = new Map<string, Set<string>>();
    const texts = new Map<string, string>();
    const note = (label: string, language: string, kind: string) => {
      const key = `${language}\u0000${norm(label)}`;
      if (!kindsOf.has(key)) kindsOf.set(key, new Set());
      kindsOf.get(key).add(kind);
      texts.set(key, `"${label}"@${language}`);
    };
    note(c.preferred_label, own, GcLabelKind.PREF);
    for (const l of labelsOf.get(id) ?? []) {
      note(l.label, (l.language || defaultLanguage).toLowerCase(), l.kind);
    }
    for (const [key, kinds] of kindsOf) {
      if (kinds.size > 1) {
        add(
          QualityCode.LABEL_OVERLAP,
          'error',
          Number(c.term_id),
          `Label ${texts.get(key)} is used as ${[...kinds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join(' and ')}`,
        );
      }
    }
  }

  // S14 across concepts: two published concepts sharing a preferred label in
  // the same language are indistinguishable for a reader or a matcher.
  for (const [key, ids] of prefIndex) {
    const distinct = [...new Set(ids)];
    if (distinct.length < 2) continue;
    const terms = distinct.map(termOf).sort((a, b) => a - b);
    const [language] = key.split('\u0000');
    for (const t of terms) {
      add(
        QualityCode.DUPLICATE_PREF_LABEL,
        'error',
        t,
        `Shares its preferred label in "${language}" with term(s) ${terms
          .filter((x) => x !== t)
          .join(', ')}`,
      );
    }
  }

  // ---------------------------------------------------------- relations

  const parents = new Map<number, number[]>();
  const relatedPairs: [number, number][] = [];
  for (const r of relations) {
    const a = Number(r.concept_id);
    const b = Number(r.related_concept_id);
    const aIn = byId.has(a);
    const bIn = byId.has(b);
    if (!aIn || !bIn) {
      // Report on the end that is ours, and only if that end ships.
      const own = aIn ? a : b;
      if (publishedIds.has(own)) {
        add(
          QualityCode.RELATION_OUTSIDE_SCHEME,
          'error',
          termOf(own),
          `Has a ${r.kind} relation to a concept outside this scheme (use a mapping instead)`,
        );
      }
      continue;
    }
    if (
      schemeIds.size > 1 &&
      Number(byId.get(a).scheme_id) !== Number(byId.get(b).scheme_id)
    ) {
      add(
        QualityCode.RELATION_OUTSIDE_SCHEME,
        'error',
        Math.min(termOf(a), termOf(b)),
        `Has a ${r.kind} relation to a concept of another scheme (use a mapping instead)`,
      );
      continue;
    }
    // A link to a draft is not published (the presenter drops it), so it
    // cannot make the published graph inconsistent.
    if (!publishedIds.has(a) || !publishedIds.has(b)) continue;
    if (r.kind === GcRelationKind.BROADER) {
      parents.set(a, [...(parents.get(a) ?? []), b]);
    } else {
      relatedPairs.push([a, b]);
    }
  }

  // Broader cycles: strongly connected components of the broader graph
  // (Tarjan). One issue per cycle, on its lowest term_id, naming every
  // member — reporting each member separately would repeat the same finding.
  const index = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  let counter = 0;
  const strongConnect = (v: number) => {
    index.set(v, counter);
    low.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);
    for (const w of parents.get(v) ?? []) {
      if (!index.has(w)) {
        strongConnect(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), index.get(w)));
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: number[] = [];
      let w: number;
      do {
        w = stack.pop();
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      const selfLoop = (parents.get(v) ?? []).includes(v);
      if (component.length > 1 || selfLoop) {
        const terms = component.map(termOf).sort((x, y) => x - y);
        add(
          QualityCode.BROADER_CYCLE,
          'error',
          terms[0],
          `Broader cycle through term(s) ${terms.join(', ')}`,
        );
      }
    }
  };
  for (const id of [...publishedIds].sort((x, y) => x - y)) {
    if (!index.has(id)) strongConnect(id);
  }

  // Ancestors with a visited set, so a cycle (already reported) cannot loop.
  const ancestorsCache = new Map<number, Set<number>>();
  const ancestorsOf = (id: number): Set<number> => {
    if (ancestorsCache.has(id)) return ancestorsCache.get(id);
    const seen = new Set<number>();
    const todo = [...(parents.get(id) ?? [])];
    while (todo.length) {
      const p = todo.pop();
      if (seen.has(p)) continue;
      seen.add(p);
      todo.push(...(parents.get(p) ?? []));
    }
    ancestorsCache.set(id, seen);
    return seen;
  };
  for (const [a, b] of relatedPairs) {
    if (ancestorsOf(a).has(b) || ancestorsOf(b).has(a)) {
      const [x, y] = [termOf(a), termOf(b)].sort((m, n) => m - n);
      add(
        QualityCode.RELATED_TO_ANCESTOR,
        'error',
        x,
        `Is related to term ${y}, which is also its ancestor or descendant`,
      );
    }
  }

  // V10: an approved concept hanging only from deprecated parents is still
  // valid, but the public hierarchy hides deprecated parents, so it would
  // show up as a top concept. Warned, not blocked.
  for (const c of published) {
    if (c.status !== GcConceptStatus.APPROVED) continue;
    const ps = parents.get(Number(c.id)) ?? [];
    if (
      ps.length &&
      ps.every((p) => byId.get(p)?.status === GcConceptStatus.DEPRECATED)
    ) {
      add(
        QualityCode.ONLY_DEPRECATED_BROADER,
        'warning',
        Number(c.term_id),
        'Every broader concept is deprecated; it will appear as a top concept',
      );
    }
  }

  // ---------------------------------------------------------- editorial

  for (const c of published) {
    const termId = Number(c.term_id);
    if (
      c.status === GcConceptStatus.APPROVED &&
      !(c.definition ?? '').replace(/<[^>]+>/g, '').trim()
    ) {
      add(
        QualityCode.MISSING_DEFINITION,
        'error',
        termId,
        'Approved concept without a definition',
      );
    }
    if (c.status === GcConceptStatus.DEPRECATED && !c.replaced_by_id) {
      // D4 allows deprecating with a written reason instead of a
      // replacement; that reason lives in the history, which this pure check
      // does not read — so it is a reminder, not a block.
      add(
        QualityCode.DEPRECATED_WITHOUT_REPLACEMENT,
        'warning',
        termId,
        'Deprecated without a replacement; make sure the reason is in its history',
      );
    }
    if (c.replaced_by_id) {
      const target = byId.get(Number(c.replaced_by_id));
      if (!target || target.status !== GcConceptStatus.APPROVED) {
        add(
          QualityCode.REPLACED_BY_NOT_APPROVED,
          'error',
          termId,
          target
            ? `Replaced by term ${Number(target.term_id)}, which is ${target.status}, not approved`
            : 'Replaced by a concept that is not in this scheme',
        );
      }
    }
  }

  // Code-point comparison, not localeCompare: the order must not depend on
  // the ICU data of whichever server runs the check.
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return issues.sort(
    (x, y) =>
      x.term_id - y.term_id || cmp(x.code, y.code) || cmp(x.message, y.message),
  );
}

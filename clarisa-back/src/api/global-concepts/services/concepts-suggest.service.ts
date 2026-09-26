import { BadRequestException, Injectable } from '@nestjs/common';
import { GcLabelKind } from '../entities/gc-label.entity';
import { PublicConcept } from '../utils/concept-presenter';
import { ConceptsReadService } from './concepts-read.service';

export const MAX_SUGGEST_TEXT = 20_000;

export interface ConceptSuggestion {
  term_id: number;
  term_uri: string;
  preferred_label: string;
  short_definition: string | null;
  definition: string | null;
  status: string;
  matched: { label: string; kind: string; count: number }[];
  replaced_by: PublicConcept['replaced_by'];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds the official concepts a text mentions, by their preferred,
 * alternative, hidden labels and acronyms (V25, V43). Pure function of the
 * published register: the text is never stored or logged, and it only
 * arrives in a POST body (V24).
 */
@Injectable()
export class ConceptsSuggestService {
  constructor(private readonly read: ConceptsReadService) {}

  async suggest(code: string, text: string, limit = 25) {
    if (typeof text !== 'string' || !text.trim())
      throw new BadRequestException('text is required');
    if (text.length > MAX_SUGGEST_TEXT)
      throw new BadRequestException(
        `text is limited to ${MAX_SUGGEST_TEXT} characters`,
      );
    const concepts = await this.read.list(code, {});
    return {
      scheme: code,
      suggestions: matchConcepts(concepts, text).slice(
        0,
        Math.max(1, Math.min(100, limit)),
      ),
      retained: false,
    };
  }
}

/**
 * Whole-word, case-insensitive match of every label, except acronyms, which
 * match case-sensitively ("IA" the acronym, not "ia" inside a Spanish text).
 * Longer labels win the overlap: "impact assessment" hides "impact" where
 * both start at the same place.
 */
export function matchConcepts(
  concepts: PublicConcept[],
  text: string,
): ConceptSuggestion[] {
  type Candidate = { concept: PublicConcept; label: string; kind: string };
  const candidates: Candidate[] = [];
  for (const c of concepts) {
    candidates.push({ concept: c, label: c.preferred_label, kind: 'pref' });
    for (const p of c.preferred_labels ?? [])
      if (p.label !== c.preferred_label)
        candidates.push({ concept: c, label: p.label, kind: 'pref' });
    for (const a of c.alternative_labels ?? [])
      candidates.push({ concept: c, label: a.label, kind: a.kind });
  }
  candidates.sort((a, b) => b.label.length - a.label.length);

  const taken: [number, number][] = [];
  const overlaps = (s: number, e: number) =>
    taken.some(([ts, te]) => s < te && e > ts);
  const hits = new Map<number, ConceptSuggestion>();
  for (const cand of candidates) {
    const label = (cand.label ?? '').trim();
    if (label.length < 2) continue;
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])${escape(label).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`,
      cand.kind === GcLabelKind.ACRONYM ? 'gu' : 'giu',
    );
    let count = 0;
    for (const m of text.matchAll(re)) {
      const s = m.index ?? 0;
      const e = s + m[0].length;
      if (overlaps(s, e)) continue;
      taken.push([s, e]);
      count++;
    }
    if (!count) continue;
    const c = cand.concept;
    const hit =
      hits.get(c.term_id) ??
      ({
        term_id: c.term_id,
        term_uri: c.term_uri,
        preferred_label: c.preferred_label,
        short_definition: c.short_definition,
        definition: c.definition,
        status: c.status,
        matched: [],
        replaced_by: c.replaced_by,
      } as ConceptSuggestion);
    hit.matched.push({ label, kind: cand.kind, count });
    hits.set(c.term_id, hit);
  }
  const total = (s: ConceptSuggestion) =>
    s.matched.reduce((n, m) => n + m.count, 0);
  return [...hits.values()].sort(
    (a, b) =>
      total(b) - total(a) || a.preferred_label.localeCompare(b.preferred_label),
  );
}

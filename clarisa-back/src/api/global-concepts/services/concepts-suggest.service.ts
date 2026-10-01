import { BadRequestException, Injectable } from '@nestjs/common';
import { GcLabelKind } from '../entities/gc-label.entity';
import { PublicConcept } from '../utils/concept-presenter';
import { ConceptsReadService } from './concepts-read.service';

export const MAX_SUGGEST_TEXT = 20_000;
const CACHE_MS = 60_000;

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

interface Entry {
  tokens: string[];
  acronym: boolean;
  label: string;
  kind: string;
  concepts: PublicConcept[];
}

/** A compiled register: label entries indexed by their first token. */
export interface ConceptMatcher {
  byFirst: Map<string, Entry[]>;
}

const WORD = /[\p{L}\p{N}]+/gu;
const tokens = (text: string) =>
  [...text.matchAll(WORD)].map((m) => ({
    raw: m[0],
    low: m[0].toLowerCase(),
  }));

/**
 * Finds the official concepts a text mentions, by their preferred,
 * alternative, hidden labels and acronyms (V25, V43). Pure function of the
 * published register: the text is never stored or logged, and it only
 * arrives in a POST body (V24). The register is compiled once a minute per
 * scheme, and a text is scanned once, token by token.
 */
@Injectable()
export class ConceptsSuggestService {
  private cache = new Map<string, { at: number; matcher: ConceptMatcher }>();

  constructor(private readonly read: ConceptsReadService) {}

  async suggest(code: string, text: string, limit = 25) {
    if (typeof text !== 'string' || !text.trim())
      throw new BadRequestException('text is required');
    if (text.length > MAX_SUGGEST_TEXT)
      throw new BadRequestException(
        `text is limited to ${MAX_SUGGEST_TEXT} characters`,
      );
    const matcher = await this.matcher(code);
    return {
      scheme: code,
      suggestions: runMatcher(matcher, text).slice(
        0,
        Math.max(1, Math.min(100, limit)),
      ),
      retained: false,
    };
  }

  private async matcher(code: string) {
    const k = (code ?? '').toLowerCase();
    const hit = this.cache.get(k);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.matcher;
    const matcher = compileMatcher(await this.read.list(k, {}));
    this.cache.set(k, { at: Date.now(), matcher });
    return matcher;
  }
}

export function compileMatcher(concepts: PublicConcept[]): ConceptMatcher {
  const entries = new Map<string, Entry>();
  const add = (c: PublicConcept, label: string, kind: string) => {
    const toks = tokens(label ?? '');
    const text = toks.map((t) => t.low).join(' ');
    if (!text || text.length < 2) return;
    const acronym = kind === GcLabelKind.ACRONYM;
    const id = `${acronym ? toks.map((t) => t.raw).join(' ') : text}|${acronym}`;
    const e = entries.get(id) ?? {
      tokens: acronym ? toks.map((t) => t.raw) : toks.map((t) => t.low),
      acronym,
      label: label.trim(),
      kind,
      concepts: [],
    };
    if (!e.concepts.includes(c)) e.concepts.push(c);
    entries.set(id, e);
  };
  for (const c of concepts) {
    add(c, c.preferred_label, 'pref');
    for (const p of c.preferred_labels ?? []) add(c, p.label, 'pref');
    for (const a of c.alternative_labels ?? []) add(c, a.label, a.kind);
  }
  const byFirst = new Map<string, Entry[]>();
  for (const e of entries.values()) {
    const first = e.tokens[0].toLowerCase();
    const list = byFirst.get(first) ?? [];
    list.push(e);
    byFirst.set(first, list);
  }
  for (const list of byFirst.values())
    list.sort((a, b) => b.tokens.length - a.tokens.length);
  return { byFirst };
}

/**
 * Left-to-right, longest label first: "impact assessment" wins over
 * "impact" at the same place, and matched words are not reused. Acronyms
 * compare case-sensitively ("IA", not "ia" inside a Spanish text). A label
 * two concepts share reports both.
 */
export function runMatcher(
  matcher: ConceptMatcher,
  text: string,
): ConceptSuggestion[] {
  const toks = tokens(text);
  const hits = new Map<number, ConceptSuggestion>();
  let i = 0;
  while (i < toks.length) {
    const candidates = matcher.byFirst.get(toks[i].low);
    let used = 1;
    const found = candidates?.find((e) =>
      e.tokens.every((t, j) => {
        const tok = toks[i + j];
        return tok && (e.acronym ? tok.raw === t : tok.low === t);
      }),
    );
    if (found) {
      used = found.tokens.length;
      for (const c of found.concepts) {
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
        const m = hit.matched.find((x) => x.label === found.label);
        if (m) m.count++;
        else
          hit.matched.push({ label: found.label, kind: found.kind, count: 1 });
        hits.set(c.term_id, hit);
      }
    }
    i += used;
  }
  const total = (s: ConceptSuggestion) =>
    s.matched.reduce((n, m) => n + m.count, 0);
  return [...hits.values()].sort(
    (a, b) =>
      total(b) - total(a) || a.preferred_label.localeCompare(b.preferred_label),
  );
}

/** Convenience for tests and one-off calls. */
export const matchConcepts = (concepts: PublicConcept[], text: string) =>
  runMatcher(compileMatcher(concepts), text);

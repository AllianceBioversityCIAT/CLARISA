/**
 * Text search of the public list, in three tiers (best first):
 *
 *   1. exact  — the words of the query appear together and in order
 *               ("impact assessment"); the last word may be cut ("evalu").
 *   2. words  — every word of the query appears somewhere, in any order and
 *               in any of the searched texts ("here ai" in "AI … here").
 *   3. similar — every word is close to a word of the concept by edit
 *               distance, with swapped letters counted as one edit, so typos
 *               and missing letters still find it ("ere ia" → "here AI",
 *               "ola" → "hola").
 *
 * Accents and case never matter. Each hit carries the character ranges that
 * matched, per text, so a client can highlight them without searching again.
 * Pure and synchronous: the service loads the texts, this ranks them.
 */

export type SearchTier = 'exact' | 'words' | 'similar';

/** `[start, end)` character offsets in the original text. */
export type Range = [number, number];

export interface SearchableText {
  /** Where the text comes from: `preferred_label`, `alternative_labels`, `definition`. */
  field: SearchField;
  text: string;
}

export type SearchField =
  | 'term_id'
  | 'preferred_label'
  | 'alternative_labels'
  | 'hidden_labels'
  | 'short_definition'
  | 'definition';

export interface SearchDoc {
  id: number;
  /** Tie-break for equal scores (the list is alphabetical). */
  order: number;
  texts: SearchableText[];
}

export interface SearchHighlight {
  field: SearchField;
  /** The alternative label that matched; only for `alternative_labels`. */
  text?: string;
  ranges: Range[];
}

export interface SearchMatch {
  tier: SearchTier;
  /** 0–1: 1 for exact and words hits, the mean similarity for similar ones. */
  score: number;
  highlights: SearchHighlight[];
}

export interface SearchHit {
  id: number;
  match: SearchMatch;
}

interface Word {
  norm: string;
  start: number;
  end: number;
}

const TIER_RANK: Record<SearchTier, number> = {
  exact: 3,
  words: 2,
  similar: 1,
};
const FIELD_WEIGHT: Record<SearchField, number> = {
  term_id: 4,
  preferred_label: 3,
  alternative_labels: 2,
  hidden_labels: 2,
  short_definition: 1,
  definition: 1,
};
/** A word shorter than this is never compared by similarity: "ia" vs "in" is noise. */
const MIN_FUZZY_LENGTH = 2;
/** Mean similarity a concept needs to count as a similar hit. */
const MIN_MEAN_SIMILARITY = 0.7;
/** Prefix matching starts at this length ("ev" is too short to mean Evaluation). */
const MIN_PREFIX_LENGTH = 3;
/** The query is capped so a pasted paragraph cannot make the search quadratic. */
const MAX_QUERY_WORDS = 8;

/** Lower case, accents removed; same length is NOT guaranteed, so offsets come from `words`. */
export function normalize(text: string): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

/** Words of a text with their offsets in the ORIGINAL string. */
export function words(text: string): Word[] {
  const out: Word[] = [];
  // Combining marks stay inside the word: "Evaluación" in NFD is one word, not two.
  const re = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? '')) !== null) {
    out.push({
      norm: normalize(m[0]),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}

export function queryWords(q: string): string[] {
  const all = words(q).map((w) => w.norm);
  // A lone letter in the middle carries no meaning and would sink every tier ("a b impact").
  const kept = all.filter((w, i) => w.length > 1 || i === all.length - 1);
  return kept.slice(0, MAX_QUERY_WORDS);
}

/**
 * Optimal string alignment distance: insert, delete, replace and swap of two
 * neighbours all cost 1, so "ia" → "ai" is one edit, like "ere" → "here".
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur.push(v);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** Edits a word of this length may carry and still count as the same word. */
function allowedEdits(length: number): number {
  return length <= 5 ? 1 : 2;
}

const isSwap = (a: string, b: string) =>
  a.length === 2 && b.length === 2 && a[0] === b[1] && a[1] === b[0];

/**
 * 0–1 closeness of a query word to a text word. A text word longer than the
 * query word is also compared by its start, so a cut word with a typo
 * ("evlau") still finds "evaluation". Two-letter words only match by swapping
 * ("ia" ↔ "ai"): replacing one of two letters ("ia" → "in") is another word.
 */
export function similarity(query: string, word: string): number {
  if (query === word) return 1;
  if (query.length < MIN_FUZZY_LENGTH) return 0;
  // Numbers (a TERM ID, a year) are exact or nothing: 2403 is not "close to" 2404.
  if (/^\d+$/.test(query)) return 0;
  if (query.length === 2) return isSwap(query, word) ? 0.75 : 0;
  const candidates = [word];
  if (word.length > query.length + 1)
    candidates.push(word.slice(0, query.length));
  let best = 0;
  for (const target of candidates) {
    const d = editDistance(query, target);
    if (d > allowedEdits(query.length)) continue;
    best = Math.max(best, 1 - d / Math.max(query.length, target.length));
  }
  return best;
}

function matchesWord(
  query: string,
  word: string,
  last: boolean,
  alone: boolean,
): boolean {
  if (word === query) return true;
  // A cut word counts from 3 letters. The last word of a longer query is still being
  // typed, so it counts from its first letter ("impact a"); a lone short word must be whole.
  const min = last && !alone ? 1 : MIN_PREFIX_LENGTH;
  return query.length >= min && word.startsWith(query);
}

interface TextWords {
  field: SearchField;
  text: string;
  words: Word[];
}

function addRange(map: Map<TextWords, Range[]>, tw: TextWords, range: Range) {
  const list = map.get(tw) ?? [];
  if (!list.some((r) => r[0] === range[0] && r[1] === range[1]))
    list.push(range);
  map.set(tw, list);
}

function toHighlights(map: Map<TextWords, Range[]>): SearchHighlight[] {
  // Hidden labels (misspellings kept on purpose) and the TERM ID match but are never shown.
  const shown = [...map.entries()].filter(
    ([tw]) => tw.field !== 'hidden_labels' && tw.field !== 'term_id',
  );
  return shown.map(([tw, ranges]) => ({
    field: tw.field,
    ...(tw.field === 'alternative_labels' ? { text: tw.text } : {}),
    ranges: ranges.sort((a, b) => a[0] - b[0]),
  }));
}

/** Tier 1: the query words in a row, in order, inside one text. */
function exactMatch(
  texts: TextWords[],
  q: string[],
): Map<TextWords, Range[]> | null {
  const found = new Map<TextWords, Range[]>();
  for (const tw of texts) {
    for (let i = 0; i + q.length <= tw.words.length; i++) {
      let ok = true;
      for (let k = 0; k < q.length && ok; k++) {
        const w = tw.words[i + k].norm;
        ok =
          k === q.length - 1
            ? matchesWord(q[k], w, true, q.length === 1)
            : w === q[k];
      }
      if (ok)
        addRange(found, tw, [
          tw.words[i].start,
          tw.words[i + q.length - 1].end,
        ]);
    }
  }
  return found.size ? found : null;
}

/** Tier 2 and 3: every query word somewhere; `fuzzy` allows close words. */
function everyWord(
  texts: TextWords[],
  q: string[],
  fuzzy: boolean,
): { map: Map<TextWords, Range[]>; score: number } | null {
  const found = new Map<TextWords, Range[]>();
  let total = 0;
  for (let k = 0; k < q.length; k++) {
    const last = k === q.length - 1;
    let best = 0;
    const hits: { tw: TextWords; w: Word }[] = [];
    for (const tw of texts) {
      for (const w of tw.words) {
        const s = matchesWord(q[k], w.norm, last, q.length === 1)
          ? 1
          : fuzzy
            ? similarity(q[k], w.norm)
            : 0;
        if (!s) continue;
        if (s > best) {
          best = s;
          hits.length = 0;
        }
        if (s === best) hits.push({ tw, w });
      }
    }
    if (!best) return null;
    total += best;
    for (const h of hits) addRange(found, h.tw, [h.w.start, h.w.end]);
  }
  const score = total / q.length;
  if (fuzzy && score < MIN_MEAN_SIMILARITY) return null;
  return { map: found, score };
}

export function matchConcept(doc: SearchDoc, q: string[]): SearchMatch | null {
  if (!q.length) return null;
  const texts: TextWords[] = doc.texts
    .filter((t) => t.text)
    .map((t) => ({ ...t, words: words(t.text) }));
  const exact = exactMatch(texts, q);
  if (exact)
    return { tier: 'exact', score: 1, highlights: toHighlights(exact) };
  const all = everyWord(texts, q, false);
  if (all)
    return { tier: 'words', score: 1, highlights: toHighlights(all.map) };
  const close = everyWord(texts, q, true);
  if (close)
    return {
      tier: 'similar',
      score: Math.round(close.score * 100) / 100,
      highlights: toHighlights(close.map),
    };
  return null;
}

/** Best field a match touched: a hit in the label outranks one in the definition. */
function fieldWeight(match: SearchMatch): number {
  return Math.max(0, ...match.highlights.map((h) => FIELD_WEIGHT[h.field]));
}

/** Whole preferred label / alternative label equal to the query: the strongest answer. */
function wholeLabel(doc: SearchDoc, q: string[]): boolean {
  const needle = q.join(' ');
  return doc.texts.some(
    (t) =>
      t.field !== 'definition' &&
      t.field !== 'short_definition' &&
      words(t.text)
        .map((w) => w.norm)
        .join(' ') === needle,
  );
}

/** Ranked hits: tier, whole-label equality, field, label start, score, then the list's own order. */
export function searchConcepts(docs: SearchDoc[], q: string): SearchHit[] {
  const query = queryWords(q);
  if (!query.length) return [];
  const hits: {
    hit: SearchHit;
    whole: number;
    starts: number;
    weight: number;
    order: number;
  }[] = [];
  for (const doc of docs) {
    const match = matchConcept(doc, query);
    if (!match) continue;
    hits.push({
      hit: { id: doc.id, match },
      whole: match.tier === 'exact' && wholeLabel(doc, query) ? 1 : 0,
      // "Evaluation design" before "Participatory evaluation" for "evaluation".
      starts: match.highlights.some(
        (h) =>
          h.field === 'preferred_label' && h.ranges.some((r) => r[0] === 0),
      )
        ? 1
        : 0,
      weight: fieldWeight(match),
      order: doc.order,
    });
  }
  return hits
    .sort(
      (a, b) =>
        TIER_RANK[b.hit.match.tier] - TIER_RANK[a.hit.match.tier] ||
        b.whole - a.whole ||
        b.weight - a.weight ||
        b.starts - a.starts ||
        b.hit.match.score - a.hit.match.score ||
        a.order - b.order,
    )
    .map((h) => h.hit);
}

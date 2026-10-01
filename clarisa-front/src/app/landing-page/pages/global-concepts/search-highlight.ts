import { PublicConcept, SearchMatch } from '../../../shared/services/global-concepts/global-concepts-api.service';

/** A piece of text, marked when the search matched it. */
export interface TextPiece {
  text: string;
  hit: boolean;
}

/**
 * Splits a text by the `[start, end)` ranges the back returned for it.
 * Ranges outside the text, empty or overlapping are clamped and merged, so a
 * stale or odd answer can never break the text; without ranges the text is
 * one plain piece.
 */
export function highlightPieces(text: string | null | undefined, ranges: [number, number][] | null | undefined): TextPiece[] {
  const value = text ?? '';
  if (!value) return [];
  const clean = (ranges ?? [])
    .map(([a, b]) => [Math.max(0, Math.min(a, value.length)), Math.max(0, Math.min(b, value.length))] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const r of clean) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  const pieces: TextPiece[] = [];
  let at = 0;
  for (const [a, b] of merged) {
    if (a > at) pieces.push({ text: value.slice(at, a), hit: false });
    pieces.push({ text: value.slice(a, b), hit: true });
    at = b;
  }
  if (at < value.length) pieces.push({ text: value.slice(at), hit: false });
  return pieces;
}

/** What a result card shows for one concept, with the search marks. */
export interface ResultView {
  label: TextPiece[];
  summary: TextPiece[];
  /** Alternative labels that matched (acronym, synonym, hidden term), marked. */
  alsoKnownAs: TextPiece[][];
  /** `similar` hits say so, so a reader knows the words were close, not equal. */
  similar: boolean;
}

/**
 * The card of a concept for a search. The summary is the short definition,
 * unless the match is in the full definition: then the full one is shown, so
 * the marks land on the words that matched.
 */
export function resultView(concept: PublicConcept, match: SearchMatch | null | undefined): ResultView {
  const hl = match?.highlights ?? [];
  const ranges = (field: string) => hl.filter(h => h.field === field).flatMap(h => h.ranges);
  const defRanges = ranges('definition');
  const shortRanges = ranges('short_definition');
  // The summary shows the text that matched: the short definition, else the full one.
  const summary =
    shortRanges.length && concept.short_definition
      ? excerpt(concept.short_definition, shortRanges)
      : defRanges.length
        ? excerpt(concept.definition ?? '', defRanges)
        : { text: concept.short_definition || concept.definition || '', ranges: [] as [number, number][] };
  return {
    label: highlightPieces(concept.preferred_label, ranges('preferred_label')),
    summary: highlightPieces(summary.text, summary.ranges),
    alsoKnownAs: hl.filter(h => h.field === 'alternative_labels' && h.text).map(h => highlightPieces(h.text, h.ranges)),
    similar: match?.tier === 'similar'
  };
}

/** Characters of context kept before the first mark when the definition is cut. */
const LEAD = 60;
/** A mark later than this would fall below the 3-line clamp of the card. */
const CUT_AFTER = 140;

/**
 * The definition from a little before its first mark, so the mark is on
 * screen: cut at a word boundary, an ellipsis in front, ranges shifted.
 */
export function excerpt(text: string, ranges: [number, number][]): { text: string; ranges: [number, number][] } {
  const first = Math.min(...ranges.map(r => r[0]));
  if (!text || first <= CUT_AFTER) return { text, ranges };
  let from = Math.max(0, first - LEAD);
  const space = text.indexOf(' ', from);
  if (space > -1 && space < first) from = space + 1;
  const shift = from - 1; // the ellipsis takes one character
  return {
    text: '…' + text.slice(from),
    ranges: ranges.filter(r => r[1] > from).map(([a, b]) => [Math.max(a - shift, 1), b - shift] as [number, number])
  };
}

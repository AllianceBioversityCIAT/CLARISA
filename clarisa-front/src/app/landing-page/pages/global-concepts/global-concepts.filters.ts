import { PublicConcept } from '../../../shared/services/global-concepts/global-concepts-api.service';
import { ListsByCode, labelOf } from './global-concepts.utils';

/**
 * Faceted search of the public list, computed in the browser.
 *
 * `GET :scheme/concepts` answers the whole published set of a scheme (~500
 * rows), so the page downloads it once and every filter, count and sort runs
 * here: the counts are always the counts of what the reader is looking at,
 * and changing a filter costs no request.
 *
 * Logic: several values of ONE facet widen the result (OR); several facets
 * narrow it (AND). The count shown next to a value is "how many results you
 * would get if you also ticked this value": the result filtered by every
 * other facet, the facet's own selection left out (standard faceted search,
 * so ticking a second value never shows a misleading 0).
 */

export type FacetCode = 'functions' | 'phase' | 'term_type' | 'collection';
/** `best` = relevance while searching (the back's order), A to Z otherwise. */
export type SortCode = 'best' | 'az' | 'za' | 'updated';

export interface FacetDef {
  code: FacetCode;
  label: string;
  /** Controlled list whose labels name the values; none for collections. */
  list: string | null;
}

export const FACET_DEFS: FacetDef[] = [
  { code: 'functions', label: 'Function', list: 'functions' },
  { code: 'phase', label: 'Phase', list: 'phase' },
  { code: 'term_type', label: 'Term type', list: 'term_type' },
  { code: 'collection', label: 'Collection', list: null }
];

export const SORTS: { code: SortCode; label: string }[] = [
  { code: 'best', label: 'Best match' },
  { code: 'az', label: 'A to Z' },
  { code: 'za', label: 'Z to A' },
  { code: 'updated', label: 'Recently updated' }
];

export interface FilterState {
  q: string;
  facets: Record<FacetCode, string[]>;
  sort: SortCode;
  deprecated: boolean;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  checked: boolean;
}

export interface FacetView {
  code: FacetCode;
  label: string;
  options: FacetOption[];
  selected: number;
}

export interface FilterChip {
  code: FacetCode | 'q' | 'deprecated';
  value: string;
  label: string;
}

/**
 * A concept as the list may receive it. `collections` is not part of the
 * public shape yet (contract-v2 does not add it); the facet reads it when the
 * back sends it and hides itself otherwise.
 */
export type FilterableConcept = PublicConcept & {
  collections?: ({ code: string; label?: string | null } | string)[];
};

export const emptyFacets = (): Record<FacetCode, string[]> => ({ functions: [], phase: [], term_type: [], collection: [] });

export const emptyState = (): FilterState => ({ q: '', facets: emptyFacets(), sort: 'best', deprecated: false });

// ------------------------------------------------------------------ values

/** The facet values a concept carries. The phase facet reads primary and "also", like the back's filter. */
export function valuesOf(concept: FilterableConcept, code: FacetCode): string[] {
  switch (code) {
    case 'functions':
      return concept.functions ?? [];
    case 'phase':
      return [concept.phase_primary, ...(concept.phase_also ?? [])].filter((v): v is string => !!v);
    case 'term_type':
      return concept.term_type ? [concept.term_type] : [];
    case 'collection':
      return (concept.collections ?? []).map(c => (typeof c === 'string' ? c : c?.code)).filter((v): v is string => !!v);
  }
}

const fold = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Instant, local text match while the reader types: labels, acronyms,
 * definitions and the TERM id. Accent- and case-insensitive; every word must
 * appear. The debounced server search adds what only the back knows (hidden
 * search terms), see `applyFilters`' `serverHits`.
 */
export function matchesText(concept: FilterableConcept, q: string): boolean {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(
    [
      concept.preferred_label,
      ...(concept.preferred_labels ?? []).map(l => l.label),
      ...(concept.alternative_labels ?? []).map(l => l.label),
      concept.short_definition,
      concept.definition,
      String(concept.term_id)
    ].join(' \u0001 ')
  );
  return words.every(word => haystack.includes(word));
}

// ------------------------------------------------------------------ filter

/**
 * Concepts that pass the state. `except` leaves one facet out (for its own
 * counts). `serverHits` = term ids the back matched for the same `q`: once
 * given, it is the text test; before it arrives the local match stands in.
 */
export function applyFilters(
  concepts: FilterableConcept[],
  state: FilterState,
  serverHits: ReadonlySet<number> | null = null,
  except: FacetCode | null = null
): FilterableConcept[] {
  const q = state.q.trim();
  return concepts.filter(concept => {
    if (!state.deprecated && concept.status === 'deprecated') return false;
    // The back's answer for this `q` decides (exact, mixed words, similar words);
    // the local match only fills the moments before it arrives.
    if (q && (serverHits ? !serverHits.has(concept.term_id) : !matchesText(concept, q))) return false;
    for (const def of FACET_DEFS) {
      if (def.code === except) continue;
      const wanted = state.facets[def.code];
      if (!wanted.length) continue;
      const own = valuesOf(concept, def.code);
      if (!wanted.some(value => own.includes(value))) return false;
    }
    return true;
  });
}

/** value -> count of `facet` over the result filtered by every other facet. */
export function facetCounts(
  concepts: FilterableConcept[],
  state: FilterState,
  facet: FacetCode,
  serverHits: ReadonlySet<number> | null = null
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const concept of applyFilters(concepts, state, serverHits, facet)) {
    // A concept counts once per value even if it lists it twice.
    for (const value of new Set(valuesOf(concept, facet))) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Label of a collection code, read from the concepts that carry it. */
function collectionLabels(concepts: FilterableConcept[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const concept of concepts) {
    for (const c of concept.collections ?? []) {
      if (typeof c === 'string') {
        if (!out.has(c)) out.set(c, c);
      } else if (c?.code) {
        out.set(c.code, c.label || out.get(c.code) || c.code);
      }
    }
  }
  return out;
}

/**
 * The facets as drawn. Options are the values that exist in the scheme (in
 * the order of the controlled list, unknown ones after it), each with its
 * live count. A facet with no value anywhere in the scheme is left out.
 */
export function facetViews(
  concepts: FilterableConcept[],
  state: FilterState,
  lists: ListsByCode,
  serverHits: ReadonlySet<number> | null = null
): FacetView[] {
  const collections = collectionLabels(concepts);
  const views: FacetView[] = [];
  for (const def of FACET_DEFS) {
    const present = new Set<string>();
    for (const concept of concepts) {
      if (!state.deprecated && concept.status === 'deprecated') continue;
      valuesOf(concept, def.code).forEach(v => present.add(v));
    }
    state.facets[def.code].forEach(v => present.add(v));
    if (!present.size) continue;

    const ordered = def.list ? (lists[def.list] ?? []).map(o => o.value).filter(v => present.has(v)) : [];
    const rest = [...present].filter(v => !ordered.includes(v));
    const labelFor = (value: string) => (def.list ? labelOf(lists, def.list, value) : (collections.get(value) ?? value));
    rest.sort((a, b) => labelFor(a).localeCompare(labelFor(b), 'en', { sensitivity: 'base' }));

    const counts = facetCounts(concepts, state, def.code, serverHits);
    const options = [...ordered, ...rest].map(value => ({
      value,
      label: labelFor(value),
      count: counts.get(value) ?? 0,
      checked: state.facets[def.code].includes(value)
    }));
    views.push({ code: def.code, label: def.label, options, selected: state.facets[def.code].length });
  }
  return views;
}

// ------------------------------------------------------------------ sort

const time = (value: string | null | undefined) => {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
};

/** `rank` = position of each term id in the back's answer; `best` follows it when given. */
export function sortConcepts<T extends PublicConcept>(concepts: T[], sort: SortCode, rank: ReadonlyMap<number, number> | null = null): T[] {
  const byLabel = (a: T, b: T) => a.preferred_label.localeCompare(b.preferred_label, 'en', { sensitivity: 'base', numeric: true });
  const rows = [...concepts];
  if (sort === 'best' && rank) {
    const at = (c: T) => rank.get(c.term_id) ?? Number.MAX_SAFE_INTEGER;
    return rows.sort((a, b) => at(a) - at(b) || byLabel(a, b));
  }
  if (sort === 'za') return rows.sort((a, b) => byLabel(b, a));
  if (sort === 'updated') return rows.sort((a, b) => time(b.date_modified) - time(a.date_modified) || byLabel(a, b));
  return rows.sort(byLabel);
}

// ------------------------------------------------------------------ chips

export function activeChips(state: FilterState, views: FacetView[]): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.q.trim()) chips.push({ code: 'q', value: state.q.trim(), label: `"${state.q.trim()}"` });
  for (const def of FACET_DEFS) {
    const view = views.find(v => v.code === def.code);
    for (const value of state.facets[def.code]) {
      const label = view?.options.find(o => o.value === value)?.label ?? value;
      chips.push({ code: def.code, value, label: `${def.label}: ${label}` });
    }
  }
  if (state.deprecated) chips.push({ code: 'deprecated', value: '1', label: 'Including deprecated' });
  return chips;
}

/** Facet values ticked (the number on the phone "Filters (n)" button). */
export const selectedCount = (state: FilterState) => FACET_DEFS.reduce((n, def) => n + state.facets[def.code].length, 0);

export const hasAnyFilter = (state: FilterState) => !!state.q.trim() || selectedCount(state) > 0 || state.deprecated;

// ------------------------------------------------------------------ URL

/** Anything with `get` (Angular's ParamMap, URLSearchParams). */
export interface ParamReader {
  get(name: string): string | null;
}

const SORT_CODES = SORTS.map(s => s.code);

/** Longest search the URL carries. */
export const MAX_QUERY = 200;

/**
 * The search as it travels in the URL: trimmed and capped. The box may hold
 * more (a trailing space while typing, a long paste); comparing against this
 * form is how the page recognises the URL echo of its own write.
 */
export function urlQuery(q: string | null | undefined): string {
  return (q ?? '').trim().slice(0, MAX_QUERY).trim();
}

/**
 * URL -> state. Multi values travel comma-joined (`functions=mel,monitoring`),
 * the same parameter names the API uses, so a shared link reads on its own.
 */
export function parseFilterParams(params: ParamReader): FilterState {
  const state = emptyState();
  state.q = urlQuery(params.get('q'));
  for (const def of FACET_DEFS) {
    const raw = params.get(def.code) ?? '';
    state.facets[def.code] = [
      ...new Set(
        raw
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
      )
    ];
  }
  const sort = params.get('sort') as SortCode;
  state.sort = SORT_CODES.includes(sort) ? sort : 'best';
  state.deprecated = params.get('deprecated') === '1';
  return state;
}

/**
 * State -> query params for `router.navigate`. Defaults are `null` so they
 * disappear from the URL (with `queryParamsHandling: 'merge'`, `scheme` stays).
 */
export function filterParams(state: FilterState): Record<string, string | null> {
  const out: Record<string, string | null> = {
    q: urlQuery(state.q) || null,
    sort: state.sort === 'best' ? null : state.sort,
    deprecated: state.deprecated ? '1' : null
  };
  for (const def of FACET_DEFS) out[def.code] = state.facets[def.code].length ? state.facets[def.code].join(',') : null;
  return out;
}

export function sameState(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(filterParams(a)) === JSON.stringify(filterParams(b));
}

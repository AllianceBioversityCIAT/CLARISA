import { AdminConceptDetail, ConceptStatus } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { ListOption, listLabel } from './list-values';

export type IconFilter = 'any' | 'with' | 'without';

/** Every filter of the concepts table. Multi-valued fields filter with a multi-select (any of the picked values). */
export interface ConceptFilters {
  search: string;
  statuses: ConceptStatus[];
  functions: string[];
  phases: string[];
  termTypes: string[];
  icon: IconFilter;
  missingDefinition: boolean;
}

export interface FilterChip {
  /** Which filter the chip belongs to, and — for multi filters — which value it removes. */
  key: keyof ConceptFilters;
  value?: string;
  label: string;
}

export const STATUS_FILTER_LABELS: Record<ConceptStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  deprecated: 'Deprecated'
};

export function emptyFilters(): ConceptFilters {
  return { search: '', statuses: [], functions: [], phases: [], termTypes: [], icon: 'any', missingDefinition: false };
}

/** A concept "has an icon" when the admin shape lists at least one. */
export function hasIcon(concept: AdminConceptDetail): boolean {
  return Array.isArray(concept.icons) && concept.icons.length > 0;
}

export function matchesFilters(concept: AdminConceptDetail, filters: ConceptFilters): boolean {
  const needle = filters.search.trim().toLowerCase();
  if (
    needle &&
    !(
      String(concept.term_id).includes(needle) ||
      (concept.preferred_label ?? '').toLowerCase().includes(needle) ||
      (concept.definition ?? '').toLowerCase().includes(needle) ||
      (concept.alternative_labels ?? []).some(label => (label.label ?? '').toLowerCase().includes(needle))
    )
  ) {
    return false;
  }
  if (filters.statuses.length && !filters.statuses.includes(concept.status)) return false;
  if (filters.functions.length && !(concept.meliaf_function ?? []).some(fn => filters.functions.includes(fn))) return false;
  if (filters.phases.length) {
    const phases = [concept.meliaf_phase_primary, ...(concept.meliaf_phase_also ?? [])].filter(Boolean) as string[];
    if (!phases.some(phase => filters.phases.includes(phase))) return false;
  }
  if (filters.termTypes.length && !filters.termTypes.includes(concept.term_type ?? '')) return false;
  if (filters.icon === 'with' && !hasIcon(concept)) return false;
  if (filters.icon === 'without' && hasIcon(concept)) return false;
  if (filters.missingDefinition && (concept.definition ?? '').trim()) return false;
  return true;
}

/** One chip per active value, labelled with what the reader picked, never the stored code. */
export function filterChips(filters: ConceptFilters, lists: Record<string, ListOption[]>): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.search.trim()) chips.push({ key: 'search', label: `“${filters.search.trim()}”` });
  filters.statuses.forEach(value => chips.push({ key: 'statuses', value, label: `Status: ${STATUS_FILTER_LABELS[value] ?? value}` }));
  filters.functions.forEach(value =>
    chips.push({ key: 'functions', value, label: `Function: ${listLabel(lists, 'meliaf_function', value)}` })
  );
  filters.phases.forEach(value => chips.push({ key: 'phases', value, label: `Phase: ${listLabel(lists, 'meliaf_phase', value)}` }));
  filters.termTypes.forEach(value => chips.push({ key: 'termTypes', value, label: `Type: ${listLabel(lists, 'term_type', value)}` }));
  if (filters.icon === 'with') chips.push({ key: 'icon', label: 'Has an icon' });
  if (filters.icon === 'without') chips.push({ key: 'icon', label: 'No icon' });
  if (filters.missingDefinition) chips.push({ key: 'missingDefinition', label: 'Missing definition' });
  return chips;
}

/** A new filters object without the chip's value; the input is never mutated. */
export function removeChip(filters: ConceptFilters, chip: FilterChip): ConceptFilters {
  const next: ConceptFilters = {
    ...filters,
    statuses: [...filters.statuses],
    functions: [...filters.functions],
    phases: [...filters.phases],
    termTypes: [...filters.termTypes]
  };
  switch (chip.key) {
    case 'search':
      next.search = '';
      break;
    case 'icon':
      next.icon = 'any';
      break;
    case 'missingDefinition':
      next.missingDefinition = false;
      break;
    case 'statuses':
      next.statuses = next.statuses.filter(value => value !== chip.value);
      break;
    case 'functions':
    case 'phases':
    case 'termTypes':
      next[chip.key] = next[chip.key].filter(value => value !== chip.value);
      break;
  }
  return next;
}

import { AdminConcept, AdminIcon, IconInput, LabelKind } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

// ------------------------------------------------------------------ tabs

export type ConceptTab = 'details' | 'labels' | 'relations' | 'mappings' | 'icons' | 'fields' | 'history';

export interface ConceptTabOption {
  id: ConceptTab;
  label: string;
  /** Why the tab is closed, shown as its tooltip; null when it opens. */
  lockedReason: string | null;
}

const TABS: { id: ConceptTab; label: string; needsConcept: boolean }[] = [
  { id: 'details', label: 'Details', needsConcept: false },
  { id: 'labels', label: 'Labels', needsConcept: true },
  { id: 'relations', label: 'Relations', needsConcept: true },
  { id: 'mappings', label: 'Mappings', needsConcept: true },
  { id: 'icons', label: 'Icons', needsConcept: true },
  { id: 'fields', label: 'Custom fields', needsConcept: false },
  { id: 'history', label: 'History', needsConcept: true }
];

/**
 * Labels, relations, mappings, icons and history are writes on an existing
 * concept (they need its TERM ID), so a concept being created only opens
 * Details and Custom fields, which travel in the create itself.
 */
export function conceptTabs(creating: boolean): ConceptTabOption[] {
  return TABS.map(tab => ({
    id: tab.id,
    label: tab.label,
    lockedReason: creating && tab.needsConcept ? 'Create the concept first: this part is saved on an existing concept.' : null
  }));
}

/** The tab to show: the requested one if it opens, otherwise Details. */
export function resolveTab(requested: ConceptTab, creating: boolean): ConceptTab {
  const tab = conceptTabs(creating).find(option => option.id === requested);
  return tab && !tab.lockedReason ? requested : 'details';
}

// ---------------------------------------------------------------- labels

/** `pref` in the API is a preferred label in another language; the editor names it that way. */
export type EditorLabelKind = LabelKind;

export interface LabelRow {
  label: string;
  kind: EditorLabelKind;
  language: string;
  discouraged: boolean;
}

export const LABEL_KIND_OPTIONS: { label: string; value: EditorLabelKind }[] = [
  { label: 'Alternative', value: 'alt' },
  { label: 'Hidden (search only)', value: 'hidden' },
  { label: 'Acronym', value: 'acronym' },
  { label: 'Preferred, other language', value: 'pref' }
];

/**
 * The label set as the PUT replaces it: the preferred labels in other
 * languages (every entry of `preferred_labels` after the main one) plus the
 * alternative, hidden and acronym labels.
 */
export function labelRowsFrom(concept: AdminConcept): LabelRow[] {
  const prefs = (concept.preferred_labels ?? []).slice(1).map(entry => ({
    label: entry.label ?? '',
    kind: 'pref' as EditorLabelKind,
    language: entry.language ?? '',
    discouraged: false
  }));
  const others = (concept.alternative_labels ?? []).map(entry => ({
    label: entry.label ?? '',
    kind: entry.kind,
    language: entry.language ?? '',
    discouraged: !!entry.discouraged
  }));
  return [...prefs, ...others];
}

export interface LabelPayload {
  label: string;
  language?: string;
  kind: LabelKind;
  status: 'active' | 'discouraged';
}

/** Rows without text are dropped (an added row left blank is not a label). */
export function labelsPayload(rows: LabelRow[]): LabelPayload[] {
  return rows
    .map(row => ({ ...row, label: (row.label ?? '').trim(), language: (row.language ?? '').trim().toLowerCase() }))
    .filter(row => row.label)
    .map(row => {
      const out: LabelPayload = { label: row.label, kind: row.kind, status: row.discouraged ? 'discouraged' : 'active' };
      if (row.language) out.language = row.language;
      return out;
    });
}

export function labelsError(rows: LabelRow[]): string | null {
  const payload = labelsPayload(rows);
  const seen = new Set<string>();
  for (const row of payload) {
    if (row.kind === 'pref' && !row.language) return `“${row.label}” is a preferred label in another language: say which language.`;
    if (row.language && !/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(row.language)) return `“${row.language}” is not a language code (en, fr, es-419…).`;
    const key = `${row.kind}|${row.language ?? ''}|${row.label.toLowerCase()}`;
    if (seen.has(key)) return `“${row.label}” appears twice with the same kind and language.`;
    seen.add(key);
  }
  return null;
}

export function sameLabels(a: LabelRow[], b: LabelRow[]): boolean {
  return JSON.stringify(labelsPayload(a)) === JSON.stringify(labelsPayload(b));
}

// ----------------------------------------------------------------- icons

export interface IconForm {
  icon_code: string;
  icon_status: string;
  file_format: string | null;
  file_name: string;
  designer: string;
  designer_country: string;
  year_created: number | null;
  rights_and_licence: string;
  alt_text: string;
  file_link_primary: string;
  file_link_backup: string;
  date_added: string;
}

const ICON_TEXT = [
  'icon_code',
  'file_name',
  'designer',
  'designer_country',
  'rights_and_licence',
  'alt_text',
  'file_link_primary',
  'file_link_backup',
  'date_added'
] as const;

export const ICON_STATUS_FALLBACK = [
  { label: 'Final', value: 'final' },
  { label: 'Draft', value: 'draft' },
  { label: 'Placeholder', value: 'placeholder' },
  { label: 'Not yet designed', value: 'not_yet_designed' }
];

export function emptyIconForm(): IconForm {
  return {
    icon_code: '',
    icon_status: 'draft',
    file_format: null,
    file_name: '',
    designer: '',
    designer_country: '',
    year_created: null,
    rights_and_licence: '',
    alt_text: '',
    file_link_primary: '',
    file_link_backup: '',
    date_added: ''
  };
}

export function iconFormFrom(icon: AdminIcon): IconForm {
  const form = emptyIconForm();
  for (const key of ICON_TEXT) form[key] = (icon[key] as string | null | undefined) ?? '';
  form.icon_status = icon.icon_status ?? 'draft';
  form.file_format = icon.file_format ?? null;
  form.year_created = icon.year_created ?? null;
  return form;
}

export const isHttpUrl = (value: string | null | undefined): boolean => /^https?:\/\/\S+$/i.test((value ?? '').trim());

/** The rule the back enforces, checked before the request: a final icon has to be describable to a screen reader. */
export function iconFormError(form: IconForm): string | null {
  if (!form.icon_status) return 'Pick the icon status.';
  if (form.icon_status === 'final' && !form.alt_text.trim()) return 'A final icon needs its alt text: it is what screen readers say instead of the image.';
  if (form.alt_text.length > 500) return 'The alt text is limited to 500 characters.';
  if (form.icon_code.length > 50) return 'The icon code is limited to 50 characters.';
  if (form.file_link_primary.trim() && !isHttpUrl(form.file_link_primary)) return 'The primary link must start with http:// or https://.';
  if (form.file_link_backup.trim() && !isHttpUrl(form.file_link_backup)) return 'The backup link must start with http:// or https://.';
  if (form.year_created !== null && (!Number.isInteger(Number(form.year_created)) || form.year_created < 1900 || form.year_created > 2100)) {
    return 'The year is a four-digit year.';
  }
  if (form.date_added.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.date_added.trim())) return 'The date added is YYYY-MM-DD.';
  return null;
}

/** Create: filled fields only. Update: changed fields only, a cleared one as `null`. */
export function iconBody(form: IconForm, original: IconForm | null): Partial<IconInput> {
  const body: Record<string, unknown> = {};
  for (const key of ICON_TEXT) {
    const value = form[key].trim();
    if (original ? value !== original[key].trim() : value) body[key] = value || null;
  }
  if (!original || form.icon_status !== original.icon_status) body['icon_status'] = form.icon_status;
  if (original ? form.file_format !== original.file_format : form.file_format) body['file_format'] = form.file_format ?? null;
  const year = form.year_created === null || (form.year_created as unknown) === '' ? null : Number(form.year_created);
  if (original ? year !== original.year_created : year !== null) body['year_created'] = year;
  return body as Partial<IconInput>;
}

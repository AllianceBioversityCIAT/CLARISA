import { PlatformUsage, PlatformUsageSystem, UsageSummary } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

export interface UsageKpi {
  key: keyof UsageSummary['totals'];
  label: string;
  value: number;
  hint: string;
}

export interface ChartPoint {
  day: string;
  search: number;
  view: number;
}

export interface UsageChart {
  width: number;
  height: number;
  /** Plot area inside the axes. */
  left: number;
  top: number;
  plotWidth: number;
  plotHeight: number;
  max: number;
  points: ChartPoint[];
  searchPath: string;
  viewPath: string;
  searchArea: string;
  /** Horizontal guide lines with their value. */
  ticks: { y: number; value: number }[];
  /** Day labels, thinned so they never overlap. */
  labels: { x: number; text: string }[];
  /** Hit columns for the tooltip, one per day. */
  columns: { x: number; width: number; point: ChartPoint; cx: number; searchY: number; viewY: number }[];
}

export interface UsageViewModel {
  kpis: UsageKpi[];
  chart: UsageChart;
  hasActivity: boolean;
  zeroShare: number;
}

const KPIS: { key: keyof UsageSummary['totals']; label: string; hint: string }[] = [
  { key: 'search', label: 'Searches', hint: 'Queries typed in the public search box' },
  { key: 'zero_search', label: 'Searches with no result', hint: 'Candidates for new concepts' },
  { key: 'view', label: 'Concept views', hint: 'Public pages and persistent URIs opened' },
  { key: 'export', label: 'Exports', hint: 'Downloads of the scheme, any format' },
  { key: 'mcp', label: 'MCP calls', hint: 'Tools called by AI assistants' },
  { key: 'suggest', label: 'Text checks', hint: '“Check a text” runs — the text is never stored' }
];

const iso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Every day of the period, oldest first, with zeros where the back has no
 * row: a day without traffic is still a day, and skipping it would bend the
 * line. The period ends on the latest day the back reports, or today.
 */
export function fillDays(byDay: UsageSummary['by_day'], days: number, today: Date = new Date()): ChartPoint[] {
  const known = new Map((byDay ?? []).map(row => [String(row.day).slice(0, 10), row]));
  const latest = [...known.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).pop();
  const end = latest && latest > iso(today) ? new Date(`${latest}T00:00:00Z`) : new Date(`${iso(today)}T00:00:00Z`);
  const out: ChartPoint[] = [];
  for (let i = Math.max(1, days) - 1; i >= 0; i--) {
    const day = new Date(end.getTime() - i * 86400000);
    const key = iso(day);
    const row = known.get(key);
    out.push({ day: key, search: Number(row?.search ?? 0), view: Number(row?.view ?? 0) });
  }
  return out;
}

/** A round top for the axis: 1, 2, 5 × 10ⁿ. */
export function niceMax(value: number): number {
  if (value <= 4) return 4;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 5, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}

export function buildChart(points: ChartPoint[], width = 720, height = 220): UsageChart {
  const left = 40;
  const top = 12;
  const right = 12;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = niceMax(Math.max(0, ...points.map(p => Math.max(p.search, p.view))));
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const x = (i: number) => left + (points.length > 1 ? i * step : plotWidth / 2);
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const line = (key: 'search' | 'view') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const searchPath = line('search');
  const baseline = (top + plotHeight).toFixed(1);
  const searchArea = points.length ? `${searchPath} L${x(points.length - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: y(max * f), value: Math.round(max * f) }));
  const every = Math.max(1, Math.ceil(points.length / 7));
  const labels = points
    .map((p, i) => ({ i, p }))
    .filter(({ i }) => i % every === 0 || i === points.length - 1)
    .filter(({ i }, index, all) => i !== points.length - 1 || index === 0 || i - all[index - 1].i >= every / 2)
    .map(({ i, p }) => ({ x: x(i), text: p.day.slice(5) }));
  const colWidth = points.length > 1 ? step : plotWidth;
  const columns = points.map((point, i) => ({
    x: x(i) - colWidth / 2,
    width: colWidth,
    point,
    cx: x(i),
    searchY: y(point.search),
    viewY: y(point.view)
  }));
  return { width, height, left, top, plotWidth, plotHeight, max, points, searchPath, viewPath: line('view'), searchArea, ticks, labels, columns };
}

export function usageViewModel(summary: UsageSummary | null, days: number, today: Date = new Date()): UsageViewModel {
  const totals = summary?.totals ?? ({} as UsageSummary['totals']);
  const kpis = KPIS.map(kpi => ({ ...kpi, value: Number(totals[kpi.key] ?? 0) }));
  const points = fillDays(summary?.by_day ?? [], summary?.days ?? days, today);
  const searches = Number(totals.search ?? 0);
  return {
    kpis,
    chart: buildChart(points),
    hasActivity: kpis.some(kpi => kpi.value > 0) || points.some(p => p.search || p.view),
    zeroShare: searches ? Math.round((Number(totals.zero_search ?? 0) / searches) * 100) : 0
  };
}

/** One series of the stacked daily chart (the shape the panel's shared chart draws). */
export interface UsageSeries {
  key: keyof UsageSummary['totals'];
  label: string;
  color: string;
  values: number[];
}

/** Daily mix: one colour per kind, the same colours in the chart, the tiles and the legend. */
export const USAGE_COLORS: Record<keyof UsageSummary['totals'], string> = {
  search: '#0f8a63',
  view: '#2563eb',
  export: '#d97706',
  mcp: '#7c3aed',
  suggest: '#db2777',
  zero_search: '#dc2626'
};

const MIX: { key: keyof UsageSummary['totals']; label: string }[] = [
  { key: 'search', label: 'Searches' },
  { key: 'view', label: 'Concept views' },
  { key: 'export', label: 'Exports' },
  { key: 'mcp', label: 'MCP calls' },
  { key: 'suggest', label: 'Text checks' }
];

/**
 * Every day of the period with every kind, oldest first and zero-filled: the
 * labels of the x axis, the stacked series and one sparkline per tile. A
 * search with no result is already counted in `search`, so it has a tile and a
 * sparkline but no band of its own in the stack.
 */
export function usageSeries(
  summary: UsageSummary | null,
  days: number,
  today: Date = new Date()
): { labels: string[]; series: UsageSeries[]; sparks: Record<string, number[]> } {
  const points = fillDays(summary?.by_day ?? [], days, today);
  const known = new Map((summary?.by_day ?? []).map(row => [String(row.day).slice(0, 10), row]));
  const value = (day: string, key: keyof UsageSummary['totals']) => Number((known.get(day) as Record<string, unknown> | undefined)?.[key] ?? 0) || 0;
  const labels = points.map(p => p.day);
  const series = MIX.map(m => ({ key: m.key, label: m.label, color: USAGE_COLORS[m.key], values: labels.map(d => value(d, m.key)) }));
  const sparks: Record<string, number[]> = {};
  for (const key of Object.keys(USAGE_COLORS) as (keyof UsageSummary['totals'])[]) sparks[key] = labels.map(d => value(d, key));
  return { labels, series, sparks };
}

/** One connected system in "By platform", with its share and bar length. */
export interface PlatformRow extends PlatformUsageSystem {
  /** Stable key for the table: `system_key` (one row per MIS, or per key without one). */
  key: string;
  /** % of all keyed calls in the period, one decimal. */
  share: number;
  /** Bar length against the busiest system, 0–100. */
  bar: number;
}

/** Busiest first; a missing or empty answer is an empty list, never an error. */
export function platformRows(usage: PlatformUsage | null): PlatformRow[] {
  const systems = [...(usage?.systems ?? [])].sort((a, b) => b.calls - a.calls || a.acronym.localeCompare(b.acronym));
  const total = systems.reduce((sum, s) => sum + (s.calls || 0), 0);
  const max = systems.reduce((m, s) => Math.max(m, s.calls || 0), 0);
  return systems.map(s => ({
    ...s,
    // `system_key` + environment: a MIS can answer from PROD and TEST keys.
    key: `${s.system_key ?? s.mis_id ?? 'none'}:${s.environment ?? ''}`,
    share: total ? Math.round((s.calls / total) * 1000) / 10 : 0,
    bar: max ? Math.max(2, Math.round((s.calls / max) * 100)) : 0
  }));
}

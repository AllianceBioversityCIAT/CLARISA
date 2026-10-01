import { env } from 'process';

/**
 * Module configuration, read from the environment so production can switch the
 * module off (or move its URIs) without a deploy of code.
 *
 * - `GLOBAL_CONCEPTS_ENABLED` — `false` hides every route of the module (404).
 *   Defaults to on: the module is new and holds no data until someone loads it.
 * - `GLOBAL_CONCEPTS_URI_BASE` — base of every persistent concept URI. The
 *   domain is still to be agreed with the governance group (design, Audit correction 1).
 */
export const GlobalConceptsConfig = {
  get enabled(): boolean {
    return (env.GLOBAL_CONCEPTS_ENABLED ?? 'true').toLowerCase() !== 'false';
  },
  get uriBase(): string {
    return (
      env.GLOBAL_CONCEPTS_URI_BASE ?? 'https://api.clarisa.cgiar.org/concepts'
    ).replace(/\/+$/, '');
  },
  /**
   * AI assistance (D8) needs both the switch and a server-side key; without
   * either, every AI route answers 404 and the module works unchanged.
   */
  get aiEnabled(): boolean {
    return this.aiSwitchOn && this.aiHasKey;
  },
  /** `GLOBAL_CONCEPTS_AI_ENABLED=true`, key or not (the assistant says which one is missing). */
  get aiSwitchOn(): boolean {
    return (env.GLOBAL_CONCEPTS_AI_ENABLED ?? 'false').toLowerCase() === 'true';
  },
  get aiHasKey(): boolean {
    return !!env.OPEN_AI_CLARISA_ASSISTANT_TOKEN;
  },
  get aiModel(): string {
    return env.GLOBAL_CONCEPTS_AI_MODEL ?? 'gpt-5-mini';
  },
  get aiEmbeddingModel(): string {
    return env.GLOBAL_CONCEPTS_AI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
  },
  /** Hard monthly cap in USD; calls stop (503) once it is reached. */
  get aiMonthlyCapUsd(): number {
    const cap = Number(env.GLOBAL_CONCEPTS_AI_MONTHLY_CAP_USD ?? 10);
    return Number.isFinite(cap) && cap >= 0 ? cap : 10;
  },
  /** Base of the human page a browser is sent to (the CLARISA landing site). */
  get webBase(): string {
    return (
      env.GLOBAL_CONCEPTS_WEB_BASE ??
      'https://clarisa.cgiar.org/landing-page/concepts'
    ).replace(/\/+$/, '');
  },
};

/**
 * Base of the human pages for a scheme, honouring a per-scheme override —
 * so each environment points at its own landing site from data, not env.
 */
export function webBaseOf(scheme?: { web_base?: string | null } | null) {
  return (scheme?.web_base || GlobalConceptsConfig.webBase).replace(/\/+$/, '');
}

/**
 * The scheme CLARISA itself publishes. Its URIs and pages carry no scheme
 * segment (`/concepts/2374`); any other scheme keeps its own
 * (`/concepts/{scheme}/2374`).
 */
export const DEFAULT_SCHEME_CODE = 'concepts';

const isDefaultScheme = (code: string | null | undefined) =>
  (code ?? '').toLowerCase() === DEFAULT_SCHEME_CODE;

/** URI of a scheme, honouring a per-scheme override. */
export function schemeUri(scheme: { code: string; uri_base: string | null }) {
  const base = (scheme.uri_base ?? GlobalConceptsConfig.uriBase).replace(
    /\/+$/,
    '',
  );
  return isDefaultScheme(scheme.code) ? base : `${base}/${scheme.code}`;
}

/** Path of a concept's human page under the web base. */
export function conceptPagePath(schemeCode: string, termId: number) {
  return isDefaultScheme(schemeCode)
    ? `/${termId}`
    : `/${schemeCode}/${termId}`;
}

/** Persistent URI of a concept: derived, never stored (V32). */
export function conceptUri(
  scheme: { code: string; uri_base: string | null },
  termId: number,
) {
  return `${schemeUri(scheme)}/${termId}`;
}

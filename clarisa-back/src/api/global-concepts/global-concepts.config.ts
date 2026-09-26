import { env } from 'process';

/**
 * Module configuration, read from the environment so production can switch the
 * module off (or move its URIs) without a deploy of code.
 *
 * - `GLOBAL_CONCEPTS_ENABLED` — `false` hides every route of the module (404).
 *   Defaults to on: the module is new and holds no data until someone loads it.
 * - `GLOBAL_CONCEPTS_URI_BASE` — base of every persistent concept URI. The
 *   domain is still to be agreed with MELIAF Group 4 (design, Audit correction 1).
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
  /** Base of the human page a browser is sent to (the CLARISA landing site). */
  get webBase(): string {
    return (
      env.GLOBAL_CONCEPTS_WEB_BASE ??
      'https://clarisa.cgiar.org/landing-page/global-concepts'
    ).replace(/\/+$/, '');
  },
};

/** URI of a scheme, honouring a per-scheme override. */
export function schemeUri(scheme: { code: string; uri_base: string | null }) {
  return `${(scheme.uri_base ?? GlobalConceptsConfig.uriBase).replace(/\/+$/, '')}/${scheme.code}`;
}

/** Persistent URI of a concept: derived, never stored (V32). */
export function conceptUri(
  scheme: { code: string; uri_base: string | null },
  termId: number,
) {
  return `${schemeUri(scheme)}/${termId}`;
}

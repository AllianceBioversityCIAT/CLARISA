import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { GlobalConceptsApiService, McpRequest } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { DEFAULT_SCHEME, GC_BASE, copyText, humanError, scrollToSection } from '../../global-concepts.utils';

export interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  what: string;
  /** Full URL of a GET that can be opened as is in this environment. */
  live?: string;
  scope?: string;
}

export interface DocBases {
  /** `environment.apiUrl`, with its trailing slash. */
  apiRoot: string;
  /** `…/api/meliaf-taxonomy` */
  api: string;
  /** `…/concepts` (resolver of persistent URIs on this environment). */
  uris: string;
  mcp: string;
}

export function docBases(apiRoot: string): DocBases {
  const root = apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`;
  return { apiRoot: root, api: `${root}api/meliaf-taxonomy`, uris: `${root}concepts`, mcp: `${root}api/meliaf-taxonomy/mcp` };
}

/** Public, anonymous routes (global-concepts-public.controller.ts), with live links. */
export function publicEndpoints(b: DocBases, scheme: string, termId: number): Endpoint[] {
  const s = `${b.api}/${scheme}`;
  return [
    { method: 'GET', path: '/schemes', what: 'Every concept scheme (MELIAF and any domain or platform scheme).', live: `${b.api}/schemes` },
    { method: 'GET', path: '/{scheme}', what: 'Scheme metadata: title, licence, publisher, governance.', live: s },
    { method: 'GET', path: '/lists?scheme={scheme}', what: 'Controlled lists: status, function, phase, term type, derivation…', live: `${b.api}/lists?scheme=${scheme}` },
    { method: 'GET', path: '/{scheme}/fields', what: 'The scheme’s own public metadata fields (custom fields).', live: `${s}/fields` },
    {
      method: 'GET',
      path: '/{scheme}/concepts',
      what: 'All published concepts, or a search: q, status, meliaf_function, meliaf_phase, term_type, collection, version.',
      live: `${s}/concepts?q=evaluation`
    },
    { method: 'GET', path: '/{scheme}/concepts/{term_id}', what: 'One concept, full record. Add ?version= to pin a release.', live: `${s}/concepts/${termId}` },
    { method: 'GET', path: '/{scheme}/concepts/{term_id}/history', what: 'What changed and when (never who).', live: `${s}/concepts/${termId}/history` },
    { method: 'GET', path: '/{scheme}/changes?since={cursor}', what: 'Change feed for incremental sync; use next_cursor as the next since.', live: `${s}/changes?since=0&limit=50` },
    { method: 'GET', path: '/{scheme}/releases', what: 'Published releases (versions) of the scheme.', live: `${s}/releases` },
    { method: 'GET', path: '/{scheme}/export?format=', what: 'Download: json, csv, skos (Turtle) or jsonld. Add &version= to pin.', live: `${s}/export?format=json` },
    { method: 'POST', path: '/{scheme}/suggest', what: 'Body { "text": "…" }: which official concepts a text mentions. The text is never stored.' },
    { method: 'POST', path: '/mcp', what: 'MCP endpoint for AI assistants (JSON-RPC over Streamable HTTP).' }
  ];
}

/** Routes for a platform with an API key (global-concepts-requests.controller.ts). */
export function platformEndpoints(): Endpoint[] {
  return [
    { method: 'POST', path: '/platform/{scheme}/requests', what: 'Submit a request (new, edit, merge, deprecate, promote).', scope: 'meliaf-taxonomy:request' },
    { method: 'GET', path: '/platform/requests/{id}', what: 'Follow a request the platform submitted.', scope: 'meliaf-taxonomy:request' },
    { method: 'POST', path: '/platform/requests/{id}/resubmit', what: 'Answer "changes requested".', scope: 'meliaf-taxonomy:request' },
    { method: 'POST', path: '/platform/requests/{id}/transition', what: 'Decide a request in a scheme the platform owns.', scope: 'meliaf-taxonomy:review' },
    { method: 'POST', path: '/platform/{scheme}/concepts', what: 'Create a concept directly in the platform’s own scheme.', scope: 'meliaf-taxonomy:write' },
    { method: 'PATCH', path: '/platform/{scheme}/concepts/{term_id}', what: 'Edit a concept of the platform’s own scheme.', scope: 'meliaf-taxonomy:write' }
  ];
}

/** The JSON-RPC message of the "Try it" box. */
export function mcpSearchBody(query: string, id = 1): McpRequest {
  return { jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'search_concepts', arguments: { query: query.trim(), limit: 5 } } };
}

/** Copy-paste snippets, all pointing at this environment. */
export function snippets(b: DocBases, scheme: string, termId: number): Record<string, string> {
  const uri = `${b.uris}/${scheme}/${termId}`;
  const s = `${b.api}/${scheme}`;
  return {
    search: `curl "${s}/concepts?q=outcome&meliaf_function=mel"`,
    concept: `curl "${s}/concepts/${termId}"`,
    turtle: `curl -H "Accept: text/turtle" "${uri}"`,
    jsonld: `curl -H "Accept: application/ld+json" "${uri}"`,
    uriFormat: `curl "${uri}?format=skos"`,
    exportCsv: `curl -o ${scheme}.csv "${s}/export?format=csv"`,
    exportPinned: `curl -o ${scheme}-1.0.ttl "${s}/export?format=skos&version=1.0"`,
    changes: `# First sync: since=0. Keep next_cursor and send it back next time.\ncurl "${s}/changes?since=0&limit=500"\n# → { "changes": [ { "cursor": 41, "term_id": ${termId}, "action": "update", "changed_at": "…" } ], "next_cursor": 41 }\ncurl "${s}/changes?since=41&limit=500"`,
    pinned: `curl "${s}/concepts/${termId}?version=1.0"`,
    counted: `curl -H "X-API-Key: <your CLARISA API key>" "${s}/concepts?q=outcome"`,
    suggest: `curl -X POST "${s}/suggest" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "text": "The outcome evaluation used a theory of change." }'`,
    platform: `curl -X POST "${b.api}/platform/${scheme}/requests" \\\n  -H "x-api-key: <your platform key>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "type": "new",\n    "payload": { "preferred_label": "Learning agenda", "definition": "…" },\n    "rationale": "Used in our annual reports",\n    "requester_email": "person@cgiar.org",\n    "external_request_id": "our-system:1234"\n  }'`,
    claudeCode: `claude mcp add --transport http clarisa-concepts ${b.mcp}`,
    claudeDesktop: `{\n  "mcpServers": {\n    "clarisa-concepts": {\n      "command": "npx",\n      "args": ["-y", "mcp-remote", "${b.mcp}"]\n    }\n  }\n}`,
    mcpJson: `{\n  "mcpServers": {\n    "clarisa-concepts": {\n      "type": "http",\n      "url": "${b.mcp}"\n    }\n  }\n}`,
    mcpCurl: `curl -X POST "${b.mcp}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '${JSON.stringify(mcpSearchBody('theory of change'))}'`
  };
}

/** The four MCP tools (mcp.service.ts `MCP_TOOLS`) with a question that makes an assistant use each one. */
export const MCP_TOOLS_DOC = [
  { name: 'search_concepts', what: 'Search the official concepts by words, with the same filters as the list.', ask: 'Which MELIAF concepts talk about learning?' },
  {
    name: 'get_concept',
    what: 'The full official record of one concept, by TERM id or exact label.',
    ask: 'What is the official CGIAR definition of "outcome"? Cite its URI.'
  },
  {
    name: 'suggest_concepts_for_text',
    what: 'Which official concepts a text mentions. The text is not stored.',
    ask: 'Check this paragraph of my report against the official vocabulary.'
  },
  { name: 'list_releases', what: 'The published versions of a scheme.', ask: 'Which version of the MELIAF vocabulary is the latest?' }
];

export const DEV_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'endpoints', label: 'API endpoints' },
  { id: 'uris', label: 'Persistent URIs' },
  { id: 'exports', label: 'Exports' },
  { id: 'sync', label: 'Change feed and versions' },
  { id: 'counted', label: 'Get counted' },
  { id: 'platforms', label: 'Platforms and API keys' },
  { id: 'mcp', label: 'AI assistants (MCP)' }
];

/**
 * "Developers": how to use the Global Concepts API from another system or an
 * AI assistant. Every URL is built from `environment.apiUrl`, so each
 * environment documents itself and the live links really answer.
 */
@Component({
  selector: 'app-gc-developers',
  templateUrl: './developers.component.html',
  styleUrls: ['./developers.component.scss'],
  host: { class: 'gc-kit' }
})
export class DevelopersComponent implements OnInit, OnDestroy {
  readonly gcBase = GC_BASE;
  readonly scheme = DEFAULT_SCHEME;
  readonly sections = DEV_SECTIONS;
  readonly tools = MCP_TOOLS_DOC;
  readonly bases = docBases(environment.apiUrl);

  /** A real TERM id of this environment for the examples; 1 until the list answers. */
  termId = 1;
  endpoints: Endpoint[] = [];
  platform = platformEndpoints();
  code: Record<string, string> = {};
  copied: string | null = null;
  active = DEV_SECTIONS[0].id;

  tryQuery = 'theory of change';
  trying = false;
  tryResult: string | null = null;
  tryError: string | null = null;

  private copyTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private _api: GlobalConceptsApiService,
    private _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.build();
    this._api
      .concepts(this.scheme, { status: 'approved' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rows => {
          const first = (rows ?? [])[0];
          if (first?.term_id) {
            this.termId = first.term_id;
            this.build();
          }
        },
        // The examples keep TERM 1: the page is documentation, not data.
        error: () => undefined
      });
    this._route.fragment.pipe(takeUntil(this.destroy$)).subscribe({
      next: fragment => {
        if (fragment) {
          this.active = fragment;
          setTimeout(() => scrollToSection(fragment));
        }
      },
      error: () => undefined
    });
  }

  /** A second click on the same entry does not change the fragment, so the scroll is also done here. */
  goTo(id: string): void {
    this.active = id;
    setTimeout(() => scrollToSection(id));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  private build(): void {
    this.endpoints = publicEndpoints(this.bases, this.scheme, this.termId);
    this.code = snippets(this.bases, this.scheme, this.termId);
  }

  copy(key: string, text: string): void {
    copyText(text).then(ok => {
      if (!ok) return;
      this.copied = key;
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => (this.copied = null), 2000);
    });
  }

  /** Live call of the MCP tool from the browser. Locked while it runs: one click, one call. */
  tryIt(): void {
    const query = this.tryQuery.trim();
    if (this.trying || !query) return;
    this.trying = true;
    this.tryError = null;
    this.tryResult = null;
    this._api
      .mcpCall(mcpSearchBody(query))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: answer => {
          this.trying = false;
          this.tryResult = JSON.stringify(answer, null, 2);
        },
        error: (error: HttpErrorResponse) => {
          this.trying = false;
          this.tryError = humanError(error);
        }
      });
  }

  trackByPath(_: number, e: Endpoint): string {
    return e.method + e.path;
  }
}

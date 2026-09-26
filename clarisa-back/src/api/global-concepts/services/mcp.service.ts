import { HttpException, Injectable } from '@nestjs/common';
import { PublicConcept } from '../utils/concept-presenter';
import { ConceptsReadService } from './concepts-read.service';
import {
  ConceptsSuggestService,
  MAX_SUGGEST_TEXT,
} from './concepts-suggest.service';

/** Protocol revisions this server speaks; the first is the preferred one. */
export const MCP_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

const SERVER_INFO = { name: 'clarisa-global-concepts', version: '1.0.0' };
const MAX_RESULTS = 50;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const schemeArg = {
  type: 'string',
  description: 'Concept scheme code. Defaults to "meliaf".',
};

export const MCP_TOOLS = [
  {
    name: 'search_concepts',
    title: 'Search official concepts',
    description:
      'Search the published CGIAR Global Concepts (e.g. the MELIAF taxonomy) by words in labels ' +
      'and definitions, with optional filters. Returns official labels, short definitions and URIs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to search for' },
        scheme: schemeArg,
        meliaf_function: { type: 'string' },
        meliaf_phase: { type: 'string' },
        term_type: { type: 'string' },
        include_deprecated: { type: 'boolean' },
        limit: { type: 'integer', minimum: 1, maximum: MAX_RESULTS },
      },
    },
  },
  {
    name: 'get_concept',
    title: 'Get one official concept',
    description:
      'Get the full official record of a concept by its term_id or its exact label: definition, ' +
      'source, version, relations, replacement if deprecated, and its persistent URI. ' +
      'Never invent a definition: if this returns nothing, the concept is not in the register.',
    inputSchema: {
      type: 'object',
      properties: {
        term_id: { type: 'integer' },
        label: {
          type: 'string',
          description: 'Exact preferred or alternative label',
        },
        scheme: schemeArg,
      },
    },
  },
  {
    name: 'suggest_concepts_for_text',
    title: 'Find official concepts in a text',
    description:
      'Find which official concepts a text mentions (labels, synonyms, acronyms). The text is not ' +
      'stored. Use it to align a draft with the official vocabulary.',
    inputSchema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', maxLength: MAX_SUGGEST_TEXT },
        scheme: schemeArg,
      },
    },
  },
  {
    name: 'list_releases',
    title: 'List published releases',
    description: 'List the published releases (versions) of a concept scheme.',
    inputSchema: { type: 'object', properties: { scheme: schemeArg } },
  },
].map((t) => ({
  ...t,
  annotations: { readOnlyHint: true, openWorldHint: false },
}));

class ToolError extends Error {}

/**
 * A stateless MCP server (Streamable HTTP, JSON responses only) over the
 * public read of Global Concepts (D7). Hand-written JSON-RPC instead of the
 * SDK: four read-only tools do not justify a new dependency in a shared
 * lockfile (design V44). Everything it returns is what the public API
 * already returns: approved and deprecated concepts only.
 */
@Injectable()
export class McpService {
  constructor(
    private readonly read: ConceptsReadService,
    private readonly suggester: ConceptsSuggestService,
  ) {}

  /** Handles one JSON-RPC message; `null` for notifications (no answer). */
  async handle(msg: unknown): Promise<JsonRpcResponse | null> {
    const req = msg as JsonRpcRequest;
    const isNotification =
      req && typeof req === 'object' && !('id' in req) && !!req.method;
    const id =
      req && typeof req === 'object' && 'id' in req ? (req.id ?? null) : null;
    if (
      !req ||
      typeof req !== 'object' ||
      req.jsonrpc !== '2.0' ||
      typeof req.method !== 'string'
    ) {
      return this.error(id, -32600, 'Invalid request');
    }
    if (isNotification) return null;
    try {
      switch (req.method) {
        case 'initialize':
          return this.ok(id, this.initialize(req.params));
        case 'ping':
          return this.ok(id, {});
        case 'tools/list':
          return this.ok(id, { tools: MCP_TOOLS });
        case 'tools/call':
          return this.ok(id, await this.call(req.params));
        default:
          return this.error(id, -32601, `Method not found: ${req.method}`);
      }
    } catch (err) {
      if (err instanceof InvalidParams)
        return this.error(id, -32602, err.message);
      return this.error(id, -32603, 'Internal error');
    }
  }

  private initialize(params: Record<string, unknown> = {}) {
    const asked = String(params?.protocolVersion ?? '');
    return {
      protocolVersion: MCP_PROTOCOL_VERSIONS.includes(asked)
        ? asked
        : MCP_PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions:
        'Official CGIAR vocabulary served by CLARISA. Answer with the definitions these tools ' +
        'return and cite the term URI. If a concept is not found, say it is not in the official ' +
        'register instead of defining it yourself. Deprecated concepts point to their replacement.',
    };
  }

  private async call(params: Record<string, unknown> = {}) {
    const name = params?.name;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    if (typeof args !== 'object' || Array.isArray(args))
      throw new InvalidParams('arguments must be an object');
    const tool = MCP_TOOLS.find((t) => t.name === name);
    if (!tool) throw new InvalidParams(`Unknown tool: ${String(name)}`);
    const scheme = str(args.scheme) || 'meliaf';
    try {
      const data = await this.run(tool.name, scheme, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
        isError: false,
      };
    } catch (err) {
      // Tool failures are results the model can read, not protocol errors.
      const message =
        err instanceof ToolError
          ? err.message
          : err instanceof HttpException
            ? err.message
            : 'The tool failed';
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  }

  private async run(
    name: string,
    scheme: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (name) {
      case 'search_concepts': {
        const limit = clamp(args.limit, MAX_RESULTS, 10);
        const rows = await this.read.list(scheme, {
          q: str(args.query),
          meliaf_function: str(args.meliaf_function),
          meliaf_phase: str(args.meliaf_phase),
          term_type: str(args.term_type),
          status: args.include_deprecated === true ? undefined : 'approved',
        });
        return {
          total: rows.length,
          concepts: rows.slice(0, limit).map(brief),
        };
      }
      case 'get_concept': {
        if (args.term_id !== undefined && args.term_id !== null) {
          const termId = Number(args.term_id);
          if (!Number.isInteger(termId) || termId < 1)
            throw new ToolError('term_id must be a positive integer');
          return { concept: await this.read.get(scheme, termId) };
        }
        const label = str(args.label);
        if (!label) throw new ToolError('Give term_id or label');
        const key = label.toLowerCase();
        const rows = await this.read.list(scheme, { q: label });
        const hit = rows.find(
          (c) =>
            c.preferred_label.toLowerCase() === key ||
            c.preferred_labels.some((p) => p.label.toLowerCase() === key) ||
            c.alternative_labels.some((a) => a.label.toLowerCase() === key),
        );
        if (!hit)
          throw new ToolError(
            `"${label}" is not an official label in scheme "${scheme}". Try search_concepts.`,
          );
        return { concept: hit };
      }
      case 'suggest_concepts_for_text': {
        const text = typeof args.text === 'string' ? args.text : '';
        if (!text.trim()) throw new ToolError('text is required');
        return await this.suggester.suggest(scheme, text);
      }
      case 'list_releases':
        return { releases: await this.read.releases(scheme) };
    }
    throw new ToolError(`Unknown tool: ${name}`);
  }

  private ok(id: JsonRpcResponse['id'], result: unknown): JsonRpcResponse {
    return { jsonrpc: '2.0', id, result };
  }

  error(
    id: JsonRpcResponse['id'],
    code: number,
    message: string,
  ): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}

class InvalidParams extends Error {}

const str = (v: unknown) =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;
const clamp = (v: unknown, max: number, dflt: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : dflt;
};
const brief = (c: PublicConcept) => ({
  term_id: c.term_id,
  term_uri: c.term_uri,
  preferred_label: c.preferred_label,
  short_definition: c.short_definition ?? c.definition?.slice(0, 300) ?? null,
  status: c.status,
  replaced_by: c.replaced_by,
});

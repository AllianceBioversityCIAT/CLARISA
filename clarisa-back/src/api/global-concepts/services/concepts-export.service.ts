import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import {
  GC_PUBLIC_STATUSES,
  GcConcept,
  GcConceptStatus,
} from '../entities/gc-concept.entity';
import { GcLabelKind } from '../entities/gc-label.entity';
import { GcMatchType } from '../entities/gc-mapping.entity';
import { GcRelease } from '../entities/gc-release.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { schemeUri } from '../global-concepts.config';
import { PublicConcept, presentConcepts } from '../utils/concept-presenter';
import { CUSTOM_COLUMN_PREFIX } from '../utils/custom-fields';
import { ConceptGraphLoader } from './concept-graph.loader';

export type ConceptExportFormat = 'json' | 'csv' | 'skos' | 'jsonld';

export const CONCEPT_EXPORT_FORMATS: ConceptExportFormat[] = [
  'json',
  'csv',
  'skos',
  'jsonld',
];

/** What one export produces: the body and how it has to be served. */
export interface ConceptExportFile {
  body: string;
  contentType: string;
  fileName: string;
}

/** Release metadata, present only when the export is of a frozen release. */
export interface ConceptExportMeta {
  version?: string;
  releaseUri?: string;
  previousReleaseUri?: string;
  releasedAt?: string;
}

/**
 * The CSV columns, in the order and with the names of the concepts data schema
 * template ("Term register" sheet), so a download opens as the same workbook
 * Group 4 designed and can be re-imported.
 */
export const CONCEPT_CSV_COLUMNS = [
  'term_uri',
  'term_id',
  'preferred_label',
  'alternative_labels',
  'language',
  'definition',
  'short_definition',
  'scope_note',
  'example_of_use',
  'term_type',
  'broader_term',
  'narrower_terms',
  'related_terms',
  'functions',
  'phase_primary',
  'phase_also',
  'source_citation',
  'source_url',
  'derivation',
  'origin',
  'status',
  'version',
  'date_created',
  'date_modified',
  'validated_by',
  'date_validated',
  'steward',
  'replaced_by',
  'maps_to_external',
] as const;

/**
 * Columns added after the template, always after its last column so a sheet
 * built on the template keeps its positions: the icon URLs, then one
 * `x:<code>` column per public custom field (contract v2 §1, §2).
 */
export const CONCEPT_CSV_EXTRA_COLUMNS = ['icons'] as const;

const PREFIXES = {
  skos: 'http://www.w3.org/2004/02/skos/core#',
  dcterms: 'http://purl.org/dc/terms/',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  foaf: 'http://xmlns.com/foaf/0.1/',
};

const MATCH_PROPERTY: Record<string, string> = {
  [GcMatchType.EXACT]: 'skos:exactMatch',
  [GcMatchType.CLOSE]: 'skos:closeMatch',
  [GcMatchType.BROAD]: 'skos:broadMatch',
  [GcMatchType.NARROW]: 'skos:narrowMatch',
  [GcMatchType.RELATED]: 'skos:relatedMatch',
};

/**
 * One RDF object. Turtle and JSON-LD are both written from this model, so
 * the two serialisations cannot drift apart: whatever a concept says in one
 * it says in the other.
 */
type RdfTerm =
  | { iri: string }
  | { value: string; lang?: string }
  | { value: string; datatype: 'xsd:date' | 'xsd:boolean' };

interface RdfNode {
  id: string;
  type: string;
  props: [string, RdfTerm][];
}

const isPublic = (c: GcConcept) => GC_PUBLIC_STATUSES.includes(c.status);

/** BCP 47 shape; anything else is written without a tag rather than breaking the file. */
const LANG_TAG = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Downloads of a concept scheme — live, or frozen at a release (V23) — as
 * JSON (the API shape), CSV (the schema template), SKOS Turtle and JSON-LD
 * (design D6). Only what the public read publishes is exported: approved and
 * deprecated concepts, never the internal `notes` nor any editor email
 * (neither is in `PublicConcept` to begin with).
 *
 * The text helpers are adapted from the glossary export
 * (`glossary-export.service.ts` on `glossary-taxonomy-readiness`), which is
 * where the formula guard and the Turtle escaping were first proven.
 */
@Injectable()
export class ConceptsExportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly loader: ConceptGraphLoader,
  ) {}

  async export(
    code: string,
    format: ConceptExportFormat,
    version?: string,
  ): Promise<ConceptExportFile> {
    if (!CONCEPT_EXPORT_FORMATS.includes(format)) {
      throw new BadRequestException(
        `Unknown format "${format}". Use one of: ${CONCEPT_EXPORT_FORMATS.join(', ')}`,
      );
    }
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);

    if (version) {
      const release = await manager.findOne(GcRelease, {
        where: { scheme_id: scheme.id, version },
      });
      if (!release) {
        throw new NotFoundException(
          `Release ${version} of "${scheme.code}" was not found`,
        );
      }
      const previous = release.previous_release_id
        ? await manager.findOne(GcRelease, {
            where: { id: release.previous_release_id },
            select: ['id', 'release_uri'],
          })
        : null;
      const concepts = JSON.parse(release.snapshot) as PublicConcept[];
      return this.render(scheme, concepts, format, {
        version: release.version,
        releaseUri: release.release_uri,
        previousReleaseUri: previous?.release_uri ?? undefined,
        releasedAt: this.day(release.released_at),
      });
    }

    const rows = await manager.find(GcConcept, {
      where: { scheme_id: scheme.id, status: In(GC_PUBLIC_STATUSES) },
      order: { preferred_label: 'ASC' },
    });
    const graph = await this.loader.load(manager, scheme, rows);
    return this.render(scheme, presentConcepts(graph, isPublic), format);
  }

  /**
   * Pure: serialises already-public concepts. The release service calls it
   * over a snapshot, so a release file is byte-for-byte what `?version=`
   * serves later.
   */
  render(
    scheme: GcScheme,
    concepts: PublicConcept[],
    format: ConceptExportFormat,
    meta: ConceptExportMeta = {},
  ): ConceptExportFile {
    // A release file is named after its release day, so downloading it twice
    // gives the same name; a live export is named after today.
    const day =
      meta.releasedAt && ISO_DAY.test(meta.releasedAt.slice(0, 10))
        ? meta.releasedAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    const base = `${scheme.code}${meta.version ? `-${meta.version}` : ''}-${day}`;

    switch (format) {
      case 'csv':
        return {
          body: this.toCsv(concepts),
          contentType: 'text/csv; charset=utf-8',
          fileName: `${base}.csv`,
        };
      case 'skos':
        return {
          body: this.toTurtle(this.toNodes(scheme, concepts, meta)),
          contentType: 'text/turtle; charset=utf-8',
          fileName: `${base}.ttl`,
        };
      case 'jsonld':
        return {
          body: JSON.stringify(
            this.toJsonLd(this.toNodes(scheme, concepts, meta)),
            null,
            2,
          ),
          contentType: 'application/ld+json; charset=utf-8',
          fileName: `${base}.jsonld`,
        };
      case 'json':
      default:
        return {
          body: JSON.stringify(
            {
              scheme: {
                code: scheme.code,
                uri: schemeUri(scheme),
                title: scheme.title,
                license: scheme.license,
                publisher: scheme.publisher,
                governance_description: scheme.governance_description,
                ...(meta.version ? { version: meta.version } : {}),
              },
              concepts,
            },
            null,
            2,
          ),
          contentType: 'application/json; charset=utf-8',
          fileName: `${base}.json`,
        };
    }
  }

  // -------------------------------------------------------------- plain text

  /**
   * Definitions may carry the light markup the panel renders (`<br>`, links,
   * `&bull;`). A CSV cell or an RDF literal is plain text, so the markup
   * becomes line breaks and the entities their characters. Links keep their
   * target in brackets instead of disappearing.
   */
  toPlainText(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(
        /<a\s[^>]*href\s*=\s*"+([^"]*)"+[^>]*>([\s\S]*?)<\/a>/gi,
        (_m, href: string, text: string) =>
          href && href !== text ? `${text} (${href})` : text,
      )
      .replace(/<[^>]+>/g, '')
      .replace(/&bull;/g, '•')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // --------------------------------------------------------------------- CSV

  /**
   * RFC 4180 with a UTF-8 BOM so Excel opens accented text correctly. A cell
   * starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'`: terms
   * are proposed by people outside CLARISA, and a spreadsheet must never run
   * one as a formula.
   */
  private toCsv(concepts: PublicConcept[]): string {
    const cell = (value: unknown): string => {
      let text = value === null || value === undefined ? '' : String(value);
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const list = (values: (string | number)[]) => values.join('; ');
    // Custom columns come from the concepts themselves, so a release file
    // (rendered from its snapshot) has the fields that were public then.
    const custom: string[] = [];
    for (const c of concepts)
      for (const f of c.custom_fields ?? [])
        if (!custom.includes(f.code)) custom.push(f.code);
    const customCell = (c: PublicConcept, code: string) => {
      const value = (c.custom_fields ?? []).find((f) => f.code === code)?.value;
      if (value === null || value === undefined) return null;
      if (!Array.isArray(value)) return this.toPlainText(String(value));
      return list(
        value.map((v) =>
          v && typeof v === 'object' && 'term_id' in v
            ? Number((v as { term_id: number }).term_id)
            : String(v),
        ),
      );
    };
    const lines = [
      [
        ...CONCEPT_CSV_COLUMNS,
        ...CONCEPT_CSV_EXTRA_COLUMNS,
        ...custom.map((code) => `${CUSTOM_COLUMN_PREFIX}${code}`),
      ].join(','),
    ];
    for (const c of concepts) {
      // The template's `alternative_labels` are the labels a person may use:
      // alt and acronym, active. Hidden and discouraged labels are for
      // matching only; they travel in JSON / SKOS (hiddenLabel), not here.
      const alternatives = c.alternative_labels
        .filter(
          (l) =>
            !l.discouraged &&
            (l.kind === GcLabelKind.ALT || l.kind === GcLabelKind.ACRONYM),
        )
        .map((l) => l.label);
      lines.push(
        [
          c.term_uri,
          c.term_id,
          c.preferred_label,
          list(alternatives),
          c.language,
          this.toPlainText(c.definition),
          this.toPlainText(c.short_definition),
          this.toPlainText(c.scope_note),
          this.toPlainText(c.example_of_use),
          c.term_type,
          list(c.broader_terms.map((r) => r.term_id)),
          list(c.narrower_terms.map((r) => r.term_id)),
          list(c.related_terms.map((r) => r.term_id)),
          list(c.functions ?? []),
          c.phase_primary,
          list(c.phase_also ?? []),
          c.source_citation,
          c.source_url,
          c.derivation,
          c.origin,
          c.status,
          c.version,
          c.date_created,
          c.date_modified,
          list(c.validated_by ?? []),
          c.date_validated,
          c.steward,
          c.replaced_by?.term_id ?? null,
          list(c.mappings.map((m) => m.target_uri)),
          (c.icons ?? [])
            .map((i) => i.url)
            .filter((u): u is string => !!u)
            .join(' | '),
          ...custom.map((code) => customCell(c, code)),
        ]
          .map(cell)
          .join(','),
      );
    }
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  // ------------------------------------------------------------ RDF model

  /** Only a well-formed http(s) URL becomes an IRI; anything else is dropped or kept as text. */
  iri(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return /[<>"{}|\\^`\s]/.test(url.href) ? null : url.href;
    } catch {
      return null;
    }
  }

  private lang(value: string | null | undefined): string | undefined {
    return value && LANG_TAG.test(value) ? value : undefined;
  }

  /**
   * The scheme and its concepts as RDF nodes (design D6). Labels keep their
   * language tag; acronyms are alt labels and discouraged labels become
   * hidden labels, so nothing stored is silently dropped (V34). External
   * definitions carry their own rights (`dcterms:rights`, V40) next to the
   * scheme licence.
   */
  private toNodes(
    scheme: GcScheme,
    concepts: PublicConcept[],
    meta: ConceptExportMeta,
  ): RdfNode[] {
    const schemeId = schemeUri(scheme);
    const schemeLang = this.lang(scheme.default_language);
    const text = (value: string | null | undefined, lang?: string) =>
      value ? ({ value, lang } as RdfTerm) : null;
    const push = (node: RdfNode, pred: string, term: RdfTerm | null) => {
      if (term) node.props.push([pred, term]);
    };
    const iriOrText = (value: string | null | undefined): RdfTerm | null => {
      const iri = this.iri(value);
      if (iri) return { iri };
      return text(value);
    };

    const head: RdfNode = {
      id: schemeId,
      type: 'skos:ConceptScheme',
      props: [],
    };
    push(head, 'dcterms:title', text(scheme.title, schemeLang));
    push(head, 'dcterms:description', text(scheme.description, schemeLang));
    push(head, 'dcterms:publisher', text(scheme.publisher));
    push(head, 'dcterms:license', iriOrText(scheme.license));
    // Governance travels with the data (Audit correction 7).
    push(head, 'skos:note', text(scheme.governance_description, schemeLang));
    if (meta.version) {
      push(head, 'owl:versionInfo', { value: meta.version });
    }
    const releaseIri = this.iri(meta.releaseUri);
    if (releaseIri) push(head, 'owl:versionIRI', { iri: releaseIri });
    const priorIri = this.iri(meta.previousReleaseUri);
    if (priorIri) push(head, 'owl:priorVersion', { iri: priorIri });
    if (meta.releasedAt && ISO_DAY.test(meta.releasedAt.slice(0, 10))) {
      push(head, 'dcterms:issued', {
        value: meta.releasedAt.slice(0, 10),
        datatype: 'xsd:date',
      });
    }

    const nodes: RdfNode[] = [head];
    for (const c of concepts) {
      const node: RdfNode = { id: c.term_uri, type: 'skos:Concept', props: [] };
      const lang = this.lang(c.language);
      push(node, 'skos:inScheme', { iri: schemeId });
      push(node, 'skos:notation', { value: String(c.term_id) });
      for (const p of c.preferred_labels ?? []) {
        push(node, 'skos:prefLabel', text(p.label, this.lang(p.language)));
      }
      for (const l of c.alternative_labels ?? []) {
        const hidden = l.discouraged || l.kind === GcLabelKind.HIDDEN;
        push(
          node,
          hidden ? 'skos:hiddenLabel' : 'skos:altLabel',
          text(l.label, this.lang(l.language)),
        );
      }
      push(node, 'skos:definition', text(this.toPlainText(c.definition), lang));
      push(node, 'skos:scopeNote', text(this.toPlainText(c.scope_note), lang));
      push(
        node,
        'skos:example',
        text(this.toPlainText(c.example_of_use), lang),
      );
      for (const r of c.broader_terms ?? []) {
        push(node, 'skos:broader', { iri: r.uri });
      }
      for (const r of c.narrower_terms ?? []) {
        push(node, 'skos:narrower', { iri: r.uri });
      }
      for (const r of c.related_terms ?? []) {
        push(node, 'skos:related', { iri: r.uri });
      }
      for (const m of c.mappings ?? []) {
        const target = this.iri(m.target_uri);
        const pred = MATCH_PROPERTY[m.match_type];
        if (target && pred) push(node, pred, { iri: target });
      }
      push(node, 'dcterms:source', text(c.source_citation));
      const sourceIri = this.iri(c.source_url);
      if (sourceIri) push(node, 'dcterms:source', { iri: sourceIri });
      push(node, 'dcterms:rights', text(c.rights_note));
      for (const i of c.icons ?? []) {
        const depiction = this.iri(i.url);
        if (depiction) push(node, 'foaf:depiction', { iri: depiction });
      }
      for (const [pred, value] of [
        ['dcterms:created', c.date_created],
        ['dcterms:modified', c.date_modified],
      ] as const) {
        if (value && ISO_DAY.test(value)) {
          push(node, pred, { value, datatype: 'xsd:date' });
        }
      }
      push(node, 'owl:versionInfo', text(c.version));
      if (c.status === GcConceptStatus.DEPRECATED) {
        push(node, 'owl:deprecated', {
          value: 'true',
          datatype: 'xsd:boolean',
        });
        if (c.replaced_by) {
          push(node, 'dcterms:isReplacedBy', { iri: c.replaced_by.uri });
        }
      }
      nodes.push(node);
    }
    return nodes;
  }

  // ------------------------------------------------------------------ Turtle

  /** A Turtle string literal, escaped per the Turtle grammar. */
  private literal(value: string, lang?: string): string {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
    return `"${escaped}"${lang ? `@${lang}` : ''}`;
  }

  private turtleTerm(term: RdfTerm): string {
    if ('iri' in term) return `<${term.iri}>`;
    if ('datatype' in term) {
      return `${this.literal(term.value)}^^${term.datatype}`;
    }
    return this.literal(term.value, term.lang);
  }

  private toTurtle(nodes: RdfNode[]): string {
    const out = Object.entries(PREFIXES).map(
      ([p, uri]) => `@prefix ${p}: <${uri}> .`,
    );
    for (const n of nodes) {
      const props = [
        `a ${n.type}`,
        ...n.props.map(([pred, term]) => `${pred} ${this.turtleTerm(term)}`),
      ];
      out.push('', `<${n.id}> ${props.join(' ;\n  ')} .`);
    }
    return out.join('\n') + '\n';
  }

  // ----------------------------------------------------------------- JSON-LD

  private jsonLdTerm(term: RdfTerm): unknown {
    if ('iri' in term) return { '@id': term.iri };
    if ('datatype' in term) {
      if (term.datatype === 'xsd:boolean') return term.value === 'true';
      return { '@value': term.value, '@type': term.datatype };
    }
    return term.lang
      ? { '@value': term.value, '@language': term.lang }
      : term.value;
  }

  private toJsonLd(nodes: RdfNode[]) {
    return {
      '@context': { ...PREFIXES },
      '@graph': nodes.map((n) => {
        const out: Record<string, unknown> = { '@id': n.id, '@type': n.type };
        for (const [pred, term] of n.props) {
          const value = this.jsonLdTerm(term);
          const current = out[pred];
          if (current === undefined) out[pred] = value;
          else if (Array.isArray(current)) current.push(value);
          else out[pred] = [current, value];
        }
        return out;
      }),
    };
  }

  private day(value: Date | string | null | undefined): string | undefined {
    if (!value) return undefined;
    return typeof value === 'string'
      ? value.slice(0, 10)
      : value.toISOString().slice(0, 10);
  }
}

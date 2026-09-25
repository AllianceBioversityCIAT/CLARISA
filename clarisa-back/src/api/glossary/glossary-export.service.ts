import { Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { GlossaryService } from './glossary.service';
import { Glossary } from './entities/glossary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

export enum GlossaryExportFormat {
  JSON = 'json',
  CSV = 'csv',
  SKOS = 'skos',
}

/** What one export produces: the body and how it has to be served. */
export interface GlossaryExportFile {
  body: string;
  contentType: string;
  fileName: string;
}

/**
 * Base of the persistent URI of every term. It is an identifier before it is a
 * link — a SKOS consumer compares it, never rewrites it — so it is a constant
 * and not the host of whichever environment answered the request: the same
 * term has to keep the same URI in test and in production.
 */
export const GLOSSARY_SCHEME_URI = 'https://clarisa.cgiar.org/glossary';
export const GLOSSARY_TERM_URI_BASE = `${GLOSSARY_SCHEME_URI}/term/`;

/** The public keys, in the order the CSV columns follow. */
const CSV_COLUMNS = [
  'termId',
  'groupId',
  'term',
  'alternativeLabels',
  'definition',
  'source',
  'sourceUrl',
  'referenceDate',
  'portfolios',
  'editorialStatus',
  'replacedByTermId',
] as const;

type PublicTerm = {
  termId: number;
  groupId: number;
  term: string;
  alternativeLabels: string[];
  definition: string;
  source: string | null;
  sourceUrl: string | null;
  referenceDate: string | null;
  portfolios: { id: number; name: string; acronym: string }[];
  editorialStatus: string;
  replacedByTermId: number | null;
};

/**
 * The whole glossary as one downloadable file, for consumers that cannot or
 * should not page through the API: offline tools, spreadsheets, and SKOS
 * readers (the MELIAF taxonomy work lists SKOS as the exchange format).
 *
 * Read-only and built on `GlossaryService.findAll`, so an export publishes
 * exactly the active terms `GET api/glossary` publishes — no more.
 */
@Injectable()
export class GlossaryExportService {
  constructor(private readonly glossaryService: GlossaryService) {}

  async export(format: GlossaryExportFormat): Promise<GlossaryExportFile> {
    const rows = await this.glossaryService.findAll(
      FindAllOptions.SHOW_ONLY_ACTIVE,
    );
    const terms = rows.map((row) => this.toPublic(row));
    const day = new Date().toISOString().slice(0, 10);

    switch (format) {
      case GlossaryExportFormat.CSV:
        return {
          body: this.toCsv(terms),
          contentType: 'text/csv; charset=utf-8',
          fileName: `clarisa-glossary-${day}.csv`,
        };
      case GlossaryExportFormat.SKOS:
        return {
          body: this.toSkos(terms, day),
          contentType: 'text/turtle; charset=utf-8',
          fileName: `clarisa-glossary-${day}.ttl`,
        };
      case GlossaryExportFormat.JSON:
      default:
        return {
          body: JSON.stringify(terms, null, 2),
          contentType: 'application/json; charset=utf-8',
          fileName: `clarisa-glossary-${day}.json`,
        };
    }
  }

  /** Same serialization the public endpoint applies, so the keys match. */
  private toPublic(row: Glossary): PublicTerm {
    return instanceToPlain(row) as PublicTerm;
  }

  // -------------------------------------------------------------- plain text

  /**
   * Definitions are stored with the light markup the panel renders (`<br>`,
   * links, `&bull;`, see CLR-47). A CSV cell or an RDF literal is plain text,
   * so the markup becomes line breaks and the entities their characters.
   * Links keep their target in brackets instead of disappearing.
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
   * RFC 4180, with a UTF-8 BOM so Excel opens accented text correctly. A cell
   * that starts with `=`, `+`, `-` or `@` is prefixed with `'`: the glossary is
   * edited from a panel, and a spreadsheet must never run it as a formula.
   */
  private toCsv(terms: PublicTerm[]): string {
    const cell = (value: unknown): string => {
      let text = value === null || value === undefined ? '' : String(value);
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [CSV_COLUMNS.join(',')];
    for (const t of terms) {
      lines.push(
        [
          t.termId,
          t.groupId,
          t.term,
          t.alternativeLabels.join('; '),
          this.toPlainText(t.definition),
          t.source,
          t.sourceUrl,
          t.referenceDate,
          t.portfolios.map((p) => p.acronym).join('; '),
          t.editorialStatus,
          t.replacedByTermId,
        ]
          .map(cell)
          .join(','),
      );
    }
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  // -------------------------------------------------------------------- SKOS

  /** A Turtle string literal, escaped per the Turtle grammar. */
  private literal(value: string, lang = 'en'): string {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
    return `"${escaped}"${lang ? `@${lang}` : ''}`;
  }

  /** Only a well-formed http(s) URL becomes an IRI; anything else is text. */
  private iri(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return /[<>"{}|\\^`\s]/.test(url.href) ? null : `<${url.href}>`;
    } catch {
      return null;
    }
  }

  /**
   * SKOS in Turtle: one `skos:ConceptScheme` and one `skos:Concept` per term,
   * with its persistent URI (`termId`), preferred and alternative labels,
   * definition, provenance and the portfolios it applies to. Versions of the
   * same concept point at each other with `skos:related`, so a reader can tell
   * two entries with the same label apart from a duplicate.
   */
  private toSkos(terms: PublicTerm[], day: string): string {
    const scheme = `<${GLOSSARY_SCHEME_URI}>`;
    const uri = (termId: number) => `<${GLOSSARY_TERM_URI_BASE}${termId}>`;

    const byGroup = new Map<number, number[]>();
    for (const t of terms) {
      byGroup.set(t.groupId, [...(byGroup.get(t.groupId) ?? []), t.termId]);
    }

    const out: string[] = [
      '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
      '@prefix dcterms: <http://purl.org/dc/terms/> .',
      '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
      '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
      '',
      `${scheme} a skos:ConceptScheme ;`,
      `  dcterms:title ${this.literal('CLARISA Glossary')} ;`,
      `  dcterms:publisher ${this.literal('CGIAR — CLARISA', '')} ;`,
      `  dcterms:modified "${day}"^^xsd:date .`,
    ];

    for (const t of terms) {
      const props: string[] = [
        'a skos:Concept',
        `skos:inScheme ${scheme}`,
        `skos:prefLabel ${this.literal(t.term)}`,
        `skos:notation ${this.literal(String(t.termId), '')}`,
      ];
      for (const label of t.alternativeLabels) {
        props.push(`skos:altLabel ${this.literal(label)}`);
      }
      const definition = this.toPlainText(t.definition);
      if (definition) props.push(`skos:definition ${this.literal(definition)}`);
      if (t.source) props.push(`dcterms:source ${this.literal(t.source, '')}`);
      const sourceIri = this.iri(t.sourceUrl);
      if (sourceIri) props.push(`dcterms:source ${sourceIri}`);
      if (t.referenceDate) {
        props.push(`dcterms:date "${t.referenceDate}"^^xsd:date`);
      }
      for (const p of t.portfolios) {
        props.push(`skos:scopeNote ${this.literal(`Applies to ${p.name}`)}`);
      }
      if (t.editorialStatus === 'deprecated') {
        props.push('owl:deprecated "true"^^xsd:boolean');
        if (t.replacedByTermId !== null) {
          props.push(`dcterms:isReplacedBy ${uri(t.replacedByTermId)}`);
        }
      }
      for (const sibling of byGroup.get(t.groupId) ?? []) {
        if (sibling !== t.termId) props.push(`skos:related ${uri(sibling)}`);
      }
      out.push('', `${uri(t.termId)} ${props.join(' ;\n  ')} .`);
    }

    return out.join('\n') + '\n';
  }
}

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcLabelKind } from '../entities/gc-label.entity';
import { GcRelease } from '../entities/gc-release.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { PublicConcept } from '../utils/concept-presenter';
import { ConceptGraphLoader } from './concept-graph.loader';
import {
  CONCEPT_CSV_COLUMNS,
  ConceptsExportService,
} from './concepts-export.service';

const scheme = {
  id: 1,
  code: 'meliaf',
  uri_base: 'https://api.clarisa.cgiar.org/concepts',
  title: 'MELIAF Taxonomy',
  description: 'Shared MEL vocabulary',
  default_language: 'en',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  publisher: 'CGIAR',
  governance_description: 'Changes go through the PPT secretariat',
} as GcScheme;

const uri = (t: number) => `https://api.clarisa.cgiar.org/concepts/meliaf/${t}`;

const publicConcept = (
  overrides: Partial<PublicConcept> = {},
): PublicConcept => ({
  scheme: 'meliaf',
  term_id: 2374,
  term_uri: uri(2374),
  preferred_label: 'Outcome',
  language: 'en',
  preferred_labels: [
    { label: 'Outcome', language: 'en' },
    { label: 'Résultat', language: 'fr' },
  ],
  alternative_labels: [
    {
      label: 'Result',
      language: 'en',
      kind: GcLabelKind.ALT,
      discouraged: false,
    },
    {
      label: 'OC',
      language: 'en',
      kind: GcLabelKind.ACRONYM,
      discouraged: false,
    },
    {
      label: 'Outcom',
      language: 'en',
      kind: GcLabelKind.HIDDEN,
      discouraged: false,
    },
    {
      label: 'Effect',
      language: 'en',
      kind: GcLabelKind.ALT,
      discouraged: true,
    },
  ],
  definition: 'A change <br>in "state"',
  short_definition: null,
  scope_note: 'Use for\nchanges',
  example_of_use: null,
  term_type: 'concept',
  meliaf_function: ['learning', 'accountability'],
  meliaf_phase_primary: 'design',
  meliaf_phase_also: [],
  broader_terms: [{ term_id: 10, uri: uri(10), preferred_label: 'Result' }],
  narrower_terms: [],
  related_terms: [{ term_id: 11, uri: uri(11), preferred_label: 'Impact' }],
  source_citation: 'OECD DAC Glossary',
  source_url: 'https://www.oecd.org/dac/glossary',
  derivation: 'adapted',
  origin: 'lexicon',
  ai_generated_fields: [],
  status: GcConceptStatus.APPROVED,
  version: '1.2',
  date_created: '2026-01-02',
  date_modified: '2026-09-01',
  validated_by: ['PPT'],
  date_validated: null,
  steward: 'MELIAF',
  replaced_by: null,
  rights_note: null,
  mappings: [
    {
      target_scheme: 'agrovoc',
      target_uri: 'http://aims.fao.org/aos/agrovoc/c_1',
      target_label: 'outcome',
      match_type: 'close',
      justification: 'manual',
      confidence: null,
    },
    {
      target_scheme: 'other',
      target_uri: 'not a url',
      target_label: null,
      match_type: 'exact',
      justification: 'manual',
      confidence: null,
    },
  ],
  extra: {},
  ...overrides,
});

/** Parses one RFC 4180 line well enough for these fixtures. */
const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
};

describe('ConceptsExportService', () => {
  let service: ConceptsExportService;
  let manager: any;
  let loader: any;

  beforeEach(() => {
    manager = {
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
    };
    loader = {
      scheme: jest.fn(() => Promise.resolve(scheme)),
      load: jest.fn((_m: any, s: GcScheme, concepts: GcConcept[]) =>
        Promise.resolve({
          scheme: s,
          concepts,
          labels: [],
          relations: [],
          mappings: [],
          referenced: [],
        }),
      ),
    };
    service = new ConceptsExportService(
      { manager } as any,
      loader as ConceptGraphLoader,
    );
  });

  // --------------------------------------------------------------------- CSV

  describe('csv', () => {
    it('starts with a BOM, uses the schema template header and CRLF', () => {
      const { body, contentType, fileName } = service.render(
        scheme,
        [publicConcept()],
        'csv',
      );
      expect(body.charCodeAt(0)).toBe(0xfeff);
      const lines = body.slice(1).split('\r\n');
      expect(lines[0]).toBe(CONCEPT_CSV_COLUMNS.join(','));
      expect(
        lines[0].startsWith(
          'term_uri,term_id,preferred_label,alternative_labels',
        ),
      ).toBe(true);
      expect(lines[0].endsWith('replaced_by,maps_to_external')).toBe(true);
      expect(lines[lines.length - 1]).toBe('');
      expect(contentType).toBe('text/csv; charset=utf-8');
      expect(fileName).toMatch(/^meliaf-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('writes one row per concept with the joined lists and plain text', () => {
      const { body } = service.render(scheme, [publicConcept()], 'csv');
      const [, row] = body.slice(1).split('\r\n');
      const cells = parseCsvLine(row);
      const get = (col: string) =>
        cells[CONCEPT_CSV_COLUMNS.indexOf(col as any)];
      expect(cells).toHaveLength(CONCEPT_CSV_COLUMNS.length);
      expect(get('term_uri')).toBe(uri(2374));
      // Hidden and discouraged labels are for matching, not for the sheet.
      expect(get('alternative_labels')).toBe('Result; OC');
      expect(get('definition')).toBe('A change\nin "state"');
      expect(get('broader_term')).toBe('10');
      expect(get('related_terms')).toBe('11');
      expect(get('meliaf_function')).toBe('learning; accountability');
      expect(get('maps_to_external')).toBe(
        'http://aims.fao.org/aos/agrovoc/c_1; not a url',
      );
    });

    it('quotes cells and neutralises formula injection', () => {
      const { body } = service.render(
        scheme,
        [
          publicConcept({
            preferred_label: '=HYPERLINK("http://evil")',
            steward: '+1',
            source_citation: '@SUM(A1)',
            derivation: '-2',
            scope_note: 'a, b',
          }),
        ],
        'csv',
      );
      const cells = parseCsvLine(body.slice(1).split('\r\n')[1]);
      const get = (col: string) =>
        cells[CONCEPT_CSV_COLUMNS.indexOf(col as any)];
      expect(get('preferred_label')).toBe(`'=HYPERLINK("http://evil")`);
      expect(get('steward')).toBe(`'+1`);
      expect(get('source_citation')).toBe(`'@SUM(A1)`);
      expect(get('derivation')).toBe(`'-2`);
      expect(get('scope_note')).toBe('a, b');
      expect(body).toContain('"\'=HYPERLINK(""http://evil"")"');
    });

    it('writes replaced_by as the term_id of the replacement', () => {
      const { body } = service.render(
        scheme,
        [
          publicConcept({
            status: GcConceptStatus.DEPRECATED,
            replaced_by: { term_id: 99, uri: uri(99), preferred_label: 'New' },
          }),
        ],
        'csv',
      );
      const cells = parseCsvLine(body.slice(1).split('\r\n')[1]);
      expect(cells[CONCEPT_CSV_COLUMNS.indexOf('replaced_by')]).toBe('99');
    });
  });

  // -------------------------------------------------------------------- SKOS

  describe('skos (Turtle)', () => {
    it('declares the prefixes and the scheme with governance and licence', () => {
      const { body, contentType, fileName } = service.render(
        scheme,
        [publicConcept()],
        'skos',
        {
          version: '1.1.0',
          releaseUri:
            'https://api.clarisa.cgiar.org/concepts/meliaf/releases/1.1.0',
          previousReleaseUri:
            'https://api.clarisa.cgiar.org/concepts/meliaf/releases/1.0.0',
          releasedAt: '2026-09-25T10:00:00.000Z',
        },
      );
      for (const p of ['skos', 'dcterms', 'xsd', 'owl']) {
        expect(body).toContain(`@prefix ${p}: <`);
      }
      expect(body).toContain(
        '<https://api.clarisa.cgiar.org/concepts/meliaf> a skos:ConceptScheme',
      );
      expect(body).toContain('dcterms:title "MELIAF Taxonomy"@en');
      expect(body).toContain(
        'dcterms:license <https://creativecommons.org/licenses/by/4.0/>',
      );
      expect(body).toContain(
        'skos:note "Changes go through the PPT secretariat"@en',
      );
      expect(body).toContain('owl:versionInfo "1.1.0"');
      expect(body).toContain(
        'owl:priorVersion <https://api.clarisa.cgiar.org/concepts/meliaf/releases/1.0.0>',
      );
      expect(contentType).toBe('text/turtle; charset=utf-8');
      expect(fileName).toBe('meliaf-1.1.0-2026-09-25.ttl');
    });

    it('writes the concept with language-tagged labels, relations and valid mappings only', () => {
      const { body } = service.render(scheme, [publicConcept()], 'skos');
      expect(body).toContain(`<${uri(2374)}> a skos:Concept`);
      expect(body).toContain('skos:prefLabel "Outcome"@en');
      expect(body).toContain('skos:prefLabel "Résultat"@fr');
      expect(body).toContain('skos:altLabel "Result"@en');
      expect(body).toContain('skos:altLabel "OC"@en');
      expect(body).toContain('skos:hiddenLabel "Outcom"@en');
      expect(body).toContain(`skos:broader <${uri(10)}>`);
      expect(body).toContain(`skos:related <${uri(11)}>`);
      expect(body).toContain(
        'skos:closeMatch <http://aims.fao.org/aos/agrovoc/c_1>',
      );
      expect(body).not.toContain('not a url');
      expect(body).not.toContain('skos:exactMatch');
      expect(body).toContain('dcterms:created "2026-01-02"^^xsd:date');
      expect(body).toContain('owl:versionInfo "1.2"');
      expect(body).toContain(
        'dcterms:source <https://www.oecd.org/dac/glossary>',
      );
      expect(body).not.toContain('owl:deprecated');
    });

    it('maps a discouraged label to skos:hiddenLabel (V34)', () => {
      const { body } = service.render(scheme, [publicConcept()], 'skos');
      expect(body).toContain('skos:hiddenLabel "Effect"@en');
      expect(body).not.toContain('skos:altLabel "Effect"');
    });

    it('escapes Turtle literals', () => {
      const { body } = service.render(
        scheme,
        [publicConcept({ scope_note: 'Say "hi"\\ now\n\tplease' })],
        'skos',
      );
      expect(body).toContain(
        'skos:scopeNote "Say \\"hi\\"\\\\ now\\n\\tplease"@en',
      );
      // Markup is turned into plain text before it becomes a literal.
      expect(body).toContain('skos:definition "A change\\nin \\"state\\""@en');
    });

    it('marks a deprecated concept and points to its replacement', () => {
      const { body } = service.render(
        scheme,
        [
          publicConcept({
            status: GcConceptStatus.DEPRECATED,
            replaced_by: { term_id: 99, uri: uri(99), preferred_label: 'New' },
            rights_note: 'IPCC glossary, used with permission',
          }),
        ],
        'skos',
      );
      expect(body).toContain('owl:deprecated "true"^^xsd:boolean');
      expect(body).toContain(`dcterms:isReplacedBy <${uri(99)}>`);
      expect(body).toContain(
        'dcterms:rights "IPCC glossary, used with permission"',
      );
    });

    it('never exports internal notes or editor emails', () => {
      const leaky = {
        ...publicConcept(),
        notes: 'INTERNAL-NOTE-XYZ',
        updated_by_email: 'x@cgiar.org',
      } as any;
      for (const format of ['skos', 'jsonld', 'csv'] as const) {
        const { body } = service.render(scheme, [leaky], format);
        expect(body).not.toContain('INTERNAL-NOTE-XYZ');
        expect(body).not.toContain('x@cgiar.org');
      }
    });
  });

  // ----------------------------------------------------------------- JSON-LD

  describe('jsonld', () => {
    it('writes a graph with the scheme and language-tagged concept labels', () => {
      const { body, contentType, fileName } = service.render(
        scheme,
        [
          publicConcept({
            status: GcConceptStatus.DEPRECATED,
            replaced_by: { term_id: 99, uri: uri(99), preferred_label: 'New' },
          }),
        ],
        'jsonld',
      );
      const doc = JSON.parse(body);
      expect(doc['@context']).toEqual(
        expect.objectContaining({
          skos: 'http://www.w3.org/2004/02/skos/core#',
          dcterms: 'http://purl.org/dc/terms/',
          owl: 'http://www.w3.org/2002/07/owl#',
        }),
      );
      const [head, node] = doc['@graph'];
      expect(head['@type']).toBe('skos:ConceptScheme');
      expect(head['dcterms:title']).toEqual({
        '@value': 'MELIAF Taxonomy',
        '@language': 'en',
      });
      expect(node['@id']).toBe(uri(2374));
      expect(node['@type']).toBe('skos:Concept');
      expect(node['skos:prefLabel']).toEqual([
        { '@value': 'Outcome', '@language': 'en' },
        { '@value': 'Résultat', '@language': 'fr' },
      ]);
      expect(node['skos:hiddenLabel']).toEqual([
        { '@value': 'Outcom', '@language': 'en' },
        { '@value': 'Effect', '@language': 'en' },
      ]);
      expect(node['skos:inScheme']).toEqual({
        '@id': 'https://api.clarisa.cgiar.org/concepts/meliaf',
      });
      expect(node['owl:deprecated']).toBe(true);
      expect(node['dcterms:isReplacedBy']).toEqual({ '@id': uri(99) });
      expect(node['dcterms:created']).toEqual({
        '@value': '2026-01-02',
        '@type': 'xsd:date',
      });
      expect(contentType).toBe('application/ld+json; charset=utf-8');
      expect(fileName).toMatch(/\.jsonld$/);
    });
  });

  // -------------------------------------------------------------------- JSON

  it('json carries the scheme metadata and the concepts', () => {
    const { body } = service.render(scheme, [publicConcept()], 'json', {
      version: '1.0.0',
    });
    const doc = JSON.parse(body);
    expect(doc.scheme).toEqual({
      code: 'meliaf',
      uri: 'https://api.clarisa.cgiar.org/concepts/meliaf',
      title: 'MELIAF Taxonomy',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      publisher: 'CGIAR',
      governance_description: 'Changes go through the PPT secretariat',
      version: '1.0.0',
    });
    expect(doc.concepts).toHaveLength(1);
  });

  // ------------------------------------------------------------------ export

  describe('export', () => {
    it('reads only public concepts of the scheme, ordered by label', async () => {
      await service.export('meliaf', 'json');
      const [entity, options] = manager.find.mock.calls[0];
      expect(entity).toBe(GcConcept);
      expect(options.where.scheme_id).toBe(1);
      expect(options.where.status._value).toEqual(['approved', 'deprecated']);
      expect(options.order).toEqual({ preferred_label: 'ASC' });
    });

    it('drops drafts even if the query returned one', async () => {
      manager.find.mockResolvedValue([
        {
          id: 1,
          term_id: 1,
          preferred_label: 'Draft',
          status: 'draft',
          language: 'en',
        },
      ]);
      const { body } = await service.export('meliaf', 'json');
      expect(JSON.parse(body).concepts).toEqual([]);
    });

    it('serves a release from its snapshot with the release metadata', async () => {
      manager.findOne.mockImplementation((entity: any, options: any) => {
        if (entity === GcRelease && options.where.version === '1.1.0') {
          return Promise.resolve({
            id: 5,
            version: '1.1.0',
            release_uri:
              'https://api.clarisa.cgiar.org/concepts/meliaf/releases/1.1.0',
            previous_release_id: 4,
            released_at: new Date('2026-09-20T12:00:00Z'),
            snapshot: JSON.stringify([publicConcept()]),
          });
        }
        if (entity === GcRelease && options.where.id === 4) {
          return Promise.resolve({
            id: 4,
            release_uri:
              'https://api.clarisa.cgiar.org/concepts/meliaf/releases/1.0.0',
          });
        }
        return Promise.resolve(null);
      });
      const file = await service.export('meliaf', 'skos', '1.1.0');
      expect(file.fileName).toBe('meliaf-1.1.0-2026-09-20.ttl');
      expect(file.body).toContain(
        'owl:priorVersion <https://api.clarisa.cgiar.org/concepts/meliaf/releases/1.0.0>',
      );
      expect(file.body).toContain(`<${uri(2374)}> a skos:Concept`);
      expect(manager.find).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown release', async () => {
      await expect(
        service.export('meliaf', 'csv', '9.9.9'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unknown format', async () => {
      await expect(
        service.export('meliaf', 'xml' as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

import { instanceToPlain } from 'class-transformer';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { Glossary, GlossaryEditorialStatus } from './entities/glossary.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import {
  GlossaryExportFormat,
  GlossaryExportService,
} from './glossary-export.service';

/**
 * SECOND BATCH of the export contract (2026-10-29): CSV cells, plain-text
 * conversion and the SKOS layout, byte by byte. Describes what the code does
 * TODAY; `// pinned as-is` marks the oddities. A red test means a downloaded
 * file would change for a consumer.
 */

type Link = { id: number; name: string; acronym: string };
const P22: Link = { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' };
const P25: Link = { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' };

function term(
  id: number,
  title: string,
  definition: string,
  extra: Partial<Glossary> = {},
  links: Link[] = [],
): Glossary {
  const g = new Glossary();
  g.id = id;
  g.applicationName = null;
  g.group_id = null;
  g.title = title;
  g.definition = definition;
  g.source = null;
  g.sourceUrl = null;
  g.referenceDate = null;
  g.alternative_labels = null;
  g.editorial_status = GlossaryEditorialStatus.APPROVED;
  g.replaced_by_id = null;
  g.show_in_dashboard = false;
  g.glossary_portfolio_array = links.map((l) => {
    const portfolio = new Portfolio();
    portfolio.id = l.id;
    portfolio.name = l.name;
    portfolio.acronym = l.acronym;
    const link = new GlossaryPortfolio();
    link.glossary_id = id;
    link.portfolio_id = l.id;
    link.portfolio_object = portfolio;
    link.auditableFields = { is_active: true } as any;
    return link;
  });
  g.auditableFields = { is_active: true } as any;
  Object.assign(g, extra);
  return g;
}

describe('Glossary export contract, batch 2', () => {
  const findAll = jest.fn();
  const exporter = new GlossaryExportService({ findAll } as any);
  const DAY = '2026-10-29';

  beforeEach(() => {
    findAll.mockReset();
    jest.useFakeTimers().setSystemTime(new Date(`${DAY}T12:00:00Z`));
  });
  afterEach(() => jest.useRealTimers());

  const csvOf = async (...terms: Glossary[]) => {
    findAll.mockResolvedValue(terms);
    const file = await exporter.export(GlossaryExportFormat.CSV);
    // [header, ...rows] without the BOM and the final CRLF.
    return file.body.slice(1).split('\r\n');
  };
  const skosOf = async (...terms: Glossary[]) => {
    findAll.mockResolvedValue(terms);
    return (await exporter.export(GlossaryExportFormat.SKOS)).body;
  };

  // ------------------------------------------------------------ plain text

  describe('toPlainText', () => {
    const plain = (v: string | null | undefined) => exporter.toPlainText(v);

    it.each([[null], [undefined], ['']])(
      'turns %p into an empty string',
      (v) => {
        expect(plain(v)).toBe('');
      },
    );

    it('turns <br>, <br/> and <BR /> into a newline', () => {
      expect(plain('a<br>b<br/>c<BR />d')).toBe('a\nb\nc\nd');
    });

    it('closes a paragraph or a list item with a newline', () => {
      expect(plain('<p>One</p><p>Two</p>')).toBe('One\nTwo');
      expect(plain('<ul><li>a</li><li>b</li></ul>')).toBe('• a\n• b');
    });

    it('opens a list item with a bullet and a space, attributes included', () => {
      expect(plain('<li class="x">item')).toBe('• item');
    });

    it('decodes &bull; &nbsp; &quot; &#39; &apos; &lt; &gt; &amp;', () => {
      expect(plain('a&nbsp;b &quot;q&quot; &#39;s&#39; &apos;t&apos;')).toBe(
        "a b \"q\" 's' 't'",
      );
      expect(plain('&lt;x&gt; &amp; &bull; y')).toBe('<x> & • y');
    });

    it('decodes &amp; last, so &amp;lt; stays the text &lt;', () => {
      expect(plain('&amp;lt;')).toBe('&lt;');
      expect(plain('&amp;amp;')).toBe('&amp;');
    });

    it('does not decode numeric entities other than &#39;', () => {
      // pinned as-is: only the entities above are known.
      expect(plain('&#8211; &eacute; &#x27;')).toBe('&#8211; &eacute; &#x27;');
    });

    it('collapses three or more newlines into one blank line, keeps two', () => {
      expect(plain('a<br><br><br><br>b')).toBe('a\n\nb');
      expect(plain('a<br><br>b')).toBe('a\n\nb');
    });

    it('drops spaces and tabs before a newline', () => {
      expect(plain('a  \t<br>b')).toBe('a\nb');
    });

    it('trims the whole text', () => {
      expect(plain('  <br> x <br>  ')).toBe('x');
    });

    it('keeps the link target in brackets when it differs from the text', () => {
      expect(plain('<a href="https://x.org/guide">the guide</a>')).toBe(
        'the guide (https://x.org/guide)',
      );
    });

    it('shows only the text when the href is the text itself', () => {
      expect(plain('<a href="https://x.org">https://x.org</a>')).toBe(
        'https://x.org',
      );
    });

    it('shows only the text when the href is empty', () => {
      expect(plain('<a href="">site</a>')).toBe('site');
    });

    it('reads an href written with doubled quotes (how the stored text came in)', () => {
      expect(plain('<a href=""https://x.org/a"">a</a>')).toBe(
        'a (https://x.org/a)',
      );
    });

    it('loses the target of an anchor with a single-quoted href', () => {
      // pinned as-is: the anchor regex only knows double quotes, so the tag is
      // stripped like any other and the URL is gone.
      expect(plain("<a href='https://x.org/a'>site</a>")).toBe('site');
    });

    it('loses the target of an anchor whose href is unquoted', () => {
      // pinned as-is.
      expect(plain('<a href=https://x.org/a>site</a>')).toBe('site');
    });

    it('strips every other tag and keeps its text', () => {
      expect(
        plain('A <b>bold</b> and <i>italic</i> <span class="x">word</span>'),
      ).toBe('A bold and italic word');
    });

    it('turns an escaped tag back into text only after the tags are stripped', () => {
      expect(plain('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe(
        '<script>alert(1)</script>',
      );
    });

    it('swallows the text between a lone < and the next > as if it were a tag', () => {
      // pinned as-is: `<[^>]+>` takes "< b and c >" for a tag, so a definition
      // that writes "a < b and c > d" loses its middle ("a  d").
      expect(plain('a < b and c > d')).toBe('a  d');
    });

    it('keeps a lone < when no > follows', () => {
      expect(plain('a < b')).toBe('a < b');
    });
  });

  // ------------------------------------------------------------------- CSV

  describe('CSV', () => {
    it('joins several alternative labels with "; "', async () => {
      const lines = await csvOf(
        term(1, 'Impact', 'd', {
          alternative_labels: '["IA","impact evaluation","IE"]',
        }),
      );
      expect(lines[1]).toBe(
        '1,1,Impact,IA; impact evaluation; IE,d,,,,,approved,',
      );
    });

    it('joins several portfolios with "; " using their acronyms', async () => {
      const lines = await csvOf(term(1, 'Impact', 'd', {}, [P22, P25]));
      expect(lines[1]).toBe('1,1,Impact,,d,,,,P22; P25,approved,');
    });

    it('writes the id of the replacement of a deprecated term', async () => {
      const lines = await csvOf(
        term(1, 'Old', 'd', {
          editorial_status: GlossaryEditorialStatus.DEPRECATED,
          replaced_by_id: '501' as any,
        }),
      );
      expect(lines[1]).toBe('1,1,Old,,d,,,,,deprecated,501');
    });

    it('writes deprecated without a replacement as an empty last cell', async () => {
      const lines = await csvOf(
        term(1, 'Old', 'd', {
          editorial_status: GlossaryEditorialStatus.DEPRECATED,
        }),
      );
      expect(lines[1]).toBe('1,1,Old,,d,,,,,deprecated,');
    });

    it('writes groupId apart from termId for a version', async () => {
      const lines = await csvOf(
        term(354, 'Deliverable', 'd', { group_id: 42 as any }),
      );
      expect(lines[1].startsWith('354,42,Deliverable,')).toBe(true);
    });

    it('writes the three provenance columns as they are', async () => {
      const lines = await csvOf(
        term(1, 'Impact', 'd', {
          source: 'CGIAR narrative',
          sourceUrl: 'https://x.org/a',
          referenceDate: '2025-01-15',
        }),
      );
      expect(lines[1]).toBe(
        '1,1,Impact,,d,CGIAR narrative,https://x.org/a,2025-01-15,,approved,',
      );
    });

    it.each([
      ['+1 plus', "'+1 plus"],
      ['-dash', "'-dash"],
      ['@mention', "'@mention"],
      ['=SUM(A1)', "'=SUM(A1)"],
    ])(
      'prefixes a cell that starts with a formula character: %s',
      async (title, cell) => {
        const lines = await csvOf(term(1, title, 'd'));
        expect(lines[1]).toBe(`1,1,${cell},,d,,,,,approved,`);
      },
    );

    it('does not prefix a formula character that is not the first one', async () => {
      const lines = await csvOf(term(1, 'a=b+c-d@e', 'd'));
      expect(lines[1]).toBe('1,1,a=b+c-d@e,,d,,,,,approved,');
    });

    it('guards the cell before quoting it, so the quote wraps the apostrophe', async () => {
      const lines = await csvOf(term(1, '=a,b', 'd'));
      expect(lines[1]).toBe(`1,1,"'=a,b",,d,,,,,approved,`);
    });

    it('guards a definition that starts with a formula character after the markup is gone', async () => {
      const lines = await csvOf(term(1, 'T', '<p>=1+1</p>'));
      expect(lines[1]).toBe(`1,1,T,,'=1+1,,,,,approved,`);
    });

    it('does not guard a leading space, tab or quote', async () => {
      // pinned as-is: only = + - @ are guarded.
      const lines = await csvOf(term(1, ' =x', 'd'));
      expect(lines[1]).toBe('1,1, =x,,d,,,,,approved,');
    });

    it('quotes a cell with a comma and doubles its quotes', async () => {
      const lines = await csvOf(term(1, 'A, "B"', 'd'));
      expect(lines[1]).toBe('1,1,"A, ""B""",,d,,,,,approved,');
    });

    it('turns a <br> of the definition into a real newline inside a quoted cell', async () => {
      findAll.mockResolvedValue([term(1, 'T', 'line one<br>line two')]);
      const file = await exporter.export(GlossaryExportFormat.CSV);
      expect(file.body).toContain('"line one\nline two"');
      // pinned as-is: the cell holds a bare LF while rows end in CRLF.
      expect(file.body.split('\r\n')).toHaveLength(3);
    });

    it('quotes a cell with a carriage return', async () => {
      findAll.mockResolvedValue([term(1, 'T', 'x\r\ny')]);
      const file = await exporter.export(GlossaryExportFormat.CSV);
      expect(file.body).toContain('"x\r\ny"');
    });

    it('writes null and undefined cells as empty, never as the word null', async () => {
      const lines = await csvOf(term(1, 'T', 'd', { source: undefined }));
      expect(lines[1]).not.toMatch(/null|undefined/);
    });

    it('has the BOM, the header, one row per term and a final CRLF', async () => {
      findAll.mockResolvedValue([term(1, 'A', 'a'), term(2, 'B', 'b')]);
      const file = await exporter.export(GlossaryExportFormat.CSV);
      expect(file.body).toBe(
        '﻿' +
          'termId,groupId,term,alternativeLabels,definition,source,sourceUrl,referenceDate,portfolios,editorialStatus,replacedByTermId\r\n' +
          '1,1,A,,a,,,,,approved,\r\n' +
          '2,2,B,,b,,,,,approved,\r\n',
      );
    });

    it('an empty glossary is the BOM, the header and a CRLF', async () => {
      findAll.mockResolvedValue([]);
      const file = await exporter.export(GlossaryExportFormat.CSV);
      expect(file.body).toBe(
        '﻿termId,groupId,term,alternativeLabels,definition,source,sourceUrl,referenceDate,portfolios,editorialStatus,replacedByTermId\r\n',
      );
    });

    it('labels that contain a comma are quoted as one cell', async () => {
      const lines = await csvOf(
        term(1, 'T', 'd', { alternative_labels: '["a, b","c"]' }),
      );
      expect(lines[1]).toBe('1,1,T,"a, b; c",d,,,,,approved,');
    });
  });

  // ------------------------------------------------------------------ SKOS

  describe('SKOS', () => {
    const HEADER = [
      '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
      '@prefix dcterms: <http://purl.org/dc/terms/> .',
      '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
      '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
      '',
      '<https://clarisa.cgiar.org/glossary> a skos:ConceptScheme ;',
      '  dcterms:title "CLARISA Glossary"@en ;',
      '  dcterms:publisher "CGIAR — CLARISA" ;',
      `  dcterms:modified "${DAY}"^^xsd:date .`,
    ].join('\n');

    const FULL = () =>
      term(
        7,
        'Impact',
        'A <b>def</b>',
        {
          alternative_labels: '["IA"]',
          source: 'Src "x"',
          sourceUrl: 'https://example.org/a',
          referenceDate: '2025-01-15',
        },
        [P25],
      );

    it('lays out one full term exactly: order, separators, final dot and newline', async () => {
      const body = await skosOf(FULL());
      expect(body).toBe(
        HEADER +
          '\n\n' +
          [
            '<https://clarisa.cgiar.org/glossary/term/7> a skos:Concept ;',
            '  skos:inScheme <https://clarisa.cgiar.org/glossary> ;',
            '  skos:prefLabel "Impact"@en ;',
            '  skos:notation "7" ;',
            '  skos:altLabel "IA"@en ;',
            '  skos:definition "A def"@en ;',
            '  dcterms:source "Src \\"x\\"" ;',
            '  dcterms:source <https://example.org/a> ;',
            '  dcterms:date "2025-01-15"^^xsd:date ;',
            '  skos:scopeNote "Applies to CGIAR portfolio 2025-2030"@en .',
          ].join('\n') +
          '\n',
      );
    });

    it('an empty glossary is the scheme only, ending in one newline', async () => {
      const body = await skosOf();
      expect(body).toBe(HEADER + '\n');
    });

    it('separates two concepts by exactly one blank line', async () => {
      const body = await skosOf(term(1, 'A', ''), term(2, 'B', ''));
      expect(body).toBe(
        HEADER +
          '\n\n' +
          [
            '<https://clarisa.cgiar.org/glossary/term/1> a skos:Concept ;',
            '  skos:inScheme <https://clarisa.cgiar.org/glossary> ;',
            '  skos:prefLabel "A"@en ;',
            '  skos:notation "1" .',
            '',
            '<https://clarisa.cgiar.org/glossary/term/2> a skos:Concept ;',
            '  skos:inScheme <https://clarisa.cgiar.org/glossary> ;',
            '  skos:prefLabel "B"@en ;',
            '  skos:notation "2" .',
          ].join('\n') +
          '\n',
      );
    });

    it('writes skos:definition from the plain text of the definition', async () => {
      const body = await skosOf(term(1, 'A', 'one<br>two'));
      expect(body).toContain('  skos:definition "one\\ntwo"@en .');
    });

    it('omits skos:definition when the plain text is empty', async () => {
      const body = await skosOf(term(1, 'A', '<br>'));
      expect(body).not.toContain('skos:definition');
    });

    it('writes dcterms:source "text" with no language tag, even with an IRI after it', async () => {
      const body = await skosOf(
        term(1, 'A', 'd', {
          source: 'Report 2025',
          sourceUrl: 'https://x.org/r',
        }),
      );
      expect(body).toContain('  dcterms:source "Report 2025" ;');
      expect(body).not.toContain('"Report 2025"@');
      expect(body).toContain('  dcterms:source <https://x.org/r> ');
    });

    it('writes one skos:scopeNote per portfolio, in the order given', async () => {
      const body = await skosOf(term(1, 'A', 'd', {}, [P25, P22]));
      const p25 = body.indexOf(
        'skos:scopeNote "Applies to CGIAR portfolio 2025-2030"@en',
      );
      const p22 = body.indexOf(
        'skos:scopeNote "Applies to CGIAR portfolio 2022-2024"@en',
      );
      expect(p25).toBeGreaterThan(-1);
      expect(p22).toBeGreaterThan(p25);
    });

    it('escapes backslash, quote, CR, LF and tab in a literal', async () => {
      const body = await skosOf(term(1, 'a\\b "c"\r\n\t', 'd'));
      expect(body).toContain('skos:prefLabel "a\\\\b \\"c\\"\\r\\n\\t"@en');
    });

    it('writes the notation without a language tag', async () => {
      const body = await skosOf(term(12, 'A', 'd'));
      expect(body).toContain('  skos:notation "12" ');
      expect(body).not.toContain('"12"@');
    });

    it('lists skos:altLabel once per label, before the definition', async () => {
      const body = await skosOf(
        term(1, 'A', 'd', { alternative_labels: '["x","y"]' }),
      );
      const x = body.indexOf('skos:altLabel "x"@en');
      const y = body.indexOf('skos:altLabel "y"@en');
      const def = body.indexOf('skos:definition');
      expect(x).toBeGreaterThan(-1);
      expect(y).toBeGreaterThan(x);
      expect(def).toBeGreaterThan(y);
    });

    describe('iri()', () => {
      const sourceLines = async (url: string) =>
        (await skosOf(term(1, 'A', 'd', { sourceUrl: url })))
          .split('\n')
          .filter((l) => l.includes('dcterms:source'));

      it.each([
        ['javascript:alert(1)'],
        ['ftp://example.org/file'],
        ['mailto:a@b.org'],
        ['data:text/plain,hi'],
        ['file:///etc/passwd'],
        ['not a url'],
        ['https://exa mple.org'],
        ['https://example.org/a|b'],
        ['//example.org/x'],
        ['example.org'],
      ])('refuses %s: no dcterms:source IRI is written', async (url) => {
        expect(await sourceLines(url)).toEqual([]);
      });

      it.each([
        ['https://example.org/a', '<https://example.org/a>'],
        ['http://example.org/a', '<http://example.org/a>'],
        ['  https://example.org/a  ', '<https://example.org/a>'],
        ['https://example.org', '<https://example.org/>'],
        ['HTTPS://EXAMPLE.ORG/A', '<https://example.org/A>'],
      ])('accepts %p as %s', async (url, iri) => {
        expect(await sourceLines(url)).toEqual([`  dcterms:source ${iri} .`]);
      });

      it('follows the URL parser on a caret in the path: encoded on Node 24+, refused on Node 22', async () => {
        // pinned as-is: `new URL` decides. Node 24 turns ^ into %5E and the IRI
        // is emitted; Node 22 (CI and the prod image) leaves it as ^ and the
        // character check refuses it. `|` is never encoded and always refused.
        const href = new URL('https://example.org/a^b').href;
        expect(await sourceLines('https://example.org/a^b')).toEqual(
          href.includes('^') ? [] : [`  dcterms:source <${href}> .`],
        );
      });

      it('accepts a space in the path because the URL parser encodes it', async () => {
        // pinned as-is: `new URL` turns the space into %20 before the check.
        expect(await sourceLines('https://example.org/a b')).toEqual([
          '  dcterms:source <https://example.org/a%20b> .',
        ]);
      });

      it('accepts quote and braces in the path for the same reason', async () => {
        // pinned as-is: the check runs on the already-encoded href.
        expect(await sourceLines('https://example.org/a"b{c}')).toEqual([
          '  dcterms:source <https://example.org/a%22b%7Bc%7D> .',
        ]);
      });

      it('still writes the source text when its URL is refused', async () => {
        const body = await skosOf(
          term(1, 'A', 'd', {
            source: 'Memo',
            sourceUrl: 'javascript:alert(1)',
          }),
        );
        expect(body).toContain('  dcterms:source "Memo" .');
        expect(body).not.toContain('javascript');
      });
    });

    describe('deprecation', () => {
      it('writes owl:deprecated and no replacement for a deprecated term without one', async () => {
        const body = await skosOf(
          term(1, 'Old', 'd', {
            editorial_status: GlossaryEditorialStatus.DEPRECATED,
          }),
        );
        expect(body).toContain('  owl:deprecated "true"^^xsd:boolean .');
        expect(body).not.toContain('isReplacedBy');
      });

      it('writes dcterms:isReplacedBy with the URI of the replacement', async () => {
        const body = await skosOf(
          term(1, 'Old', 'd', {
            editorial_status: GlossaryEditorialStatus.DEPRECATED,
            replaced_by_id: 2 as any,
          }),
        );
        expect(body).toContain(
          '  owl:deprecated "true"^^xsd:boolean ;\n  dcterms:isReplacedBy <https://clarisa.cgiar.org/glossary/term/2> .',
        );
      });

      it('ignores replacedByTermId when the term is not deprecated', async () => {
        // pinned as-is: an approved row with a stale replaced_by_id exports no hint of it.
        const body = await skosOf(
          term(1, 'A', 'd', { replaced_by_id: 2 as any }),
        );
        expect(body).not.toContain('isReplacedBy');
        expect(body).not.toContain('owl:deprecated');
      });
    });

    describe('versions of the same concept', () => {
      it('links each entry to its siblings with skos:related, in termId order of the list', async () => {
        const a = term(1, 'Outcome', 'd', { group_id: 1 as any }, [P22]);
        const b = term(5, 'Outcome', 'd', { group_id: 1 as any }, [P25]);
        const body = await skosOf(a, b);
        expect(body).toContain(
          '  skos:related <https://clarisa.cgiar.org/glossary/term/5> .',
        );
        expect(body).toContain(
          '  skos:related <https://clarisa.cgiar.org/glossary/term/1> .',
        );
      });

      it('writes no skos:related for a term that stands alone', async () => {
        expect(
          await skosOf(term(1, 'A', 'd'), term(2, 'B', 'd')),
        ).not.toContain('skos:related');
      });

      it('only relates entries that are in the export (an inactive sibling is not mentioned)', async () => {
        // pinned as-is: the siblings come from the exported list, not the database.
        const body = await skosOf(
          term(1, 'Outcome', 'd', { group_id: 9 as any }),
        );
        expect(body).not.toContain('skos:related');
      });
    });

    it('serialises the same plain object the public endpoint does', () => {
      // Guards the premise of the export: `instanceToPlain` is the one source.
      expect(Object.keys(instanceToPlain(FULL()))).toEqual([
        'term',
        'definition',
        'source',
        'sourceUrl',
        'referenceDate',
        'groupId',
        'termId',
        'editorialStatus',
        'replacedByTermId',
        'alternativeLabels',
        'portfolios',
      ]);
    });
  });
});

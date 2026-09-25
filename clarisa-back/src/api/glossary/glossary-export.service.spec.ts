import {
  GlossaryExportFormat,
  GlossaryExportService,
} from './glossary-export.service';
import { Glossary } from './entities/glossary.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

const term = (
  id: number,
  title: string,
  definition: string,
  extra: Partial<Glossary> = {},
  portfolios: [number, string, string][] = [],
): Glossary => {
  const g = new Glossary();
  g.id = id;
  g.title = title;
  g.definition = definition;
  g.source = null;
  g.sourceUrl = null;
  g.referenceDate = null;
  g.alternative_labels = null;
  g.glossary_portfolio_array = portfolios.map(([pid, name, acronym]) => {
    const p = new Portfolio();
    p.id = pid;
    p.name = name;
    p.acronym = acronym;
    const gp = new GlossaryPortfolio();
    gp.portfolio_object = p;
    gp.auditableFields = { is_active: true } as any;
    return gp;
  });
  Object.assign(g, extra);
  return g;
};

describe('GlossaryExportService', () => {
  const findAll = jest.fn();
  const service = new GlossaryExportService({ findAll } as any);

  beforeEach(() => {
    findAll.mockReset();
    findAll.mockResolvedValue([
      term(
        12,
        'Impact assessment',
        'A study of <b>effects</b>.<br>See <a href=""https://example.org/ia"">the guide</a> &bull; done',
        {
          alternative_labels: JSON.stringify(['IA']),
          source: 'MELIA Glossary v5',
          sourceUrl: 'https://cgspace.cgiar.org/x',
          referenceDate: '2021-11-01',
        },
        [[3, 'CGIAR portfolio 2025-2030', 'P25']],
      ),
      term(13, 'Outcome', '=HYPERLINK("http://evil")', { group_id: 20 }),
      term(20, 'Outcome', 'Older, "quoted" definition', { group_id: 20 }),
    ]);
  });

  it('exports only what the public endpoint publishes: the active terms', async () => {
    await service.export(GlossaryExportFormat.JSON);
    expect(findAll).toHaveBeenCalledWith(FindAllOptions.SHOW_ONLY_ACTIVE);
  });

  it('keeps the public keys in the JSON export, termId and alternativeLabels included', async () => {
    const file = await service.export(GlossaryExportFormat.JSON);
    const parsed = JSON.parse(file.body);
    expect(file.contentType).toContain('application/json');
    expect(parsed[0]).toMatchObject({
      termId: 12,
      groupId: 12,
      term: 'Impact assessment',
      alternativeLabels: ['IA'],
      source: 'MELIA Glossary v5',
      portfolios: [
        { id: 3, acronym: 'P25', name: 'CGIAR portfolio 2025-2030' },
      ],
    });
    expect(parsed[0].id).toBeUndefined();
  });

  describe('csv', () => {
    it('writes a header, one row per term, a BOM and CRLF line ends', async () => {
      const file = await service.export(GlossaryExportFormat.CSV);
      expect(file.contentType).toContain('text/csv');
      expect(file.fileName).toMatch(
        /^clarisa-glossary-\d{4}-\d{2}-\d{2}\.csv$/,
      );
      expect(file.body.startsWith('﻿')).toBe(true);
      const lines = file.body.slice(1).trimEnd().split('\r\n');
      expect(lines[0]).toBe(
        'termId,groupId,term,alternativeLabels,definition,source,sourceUrl,referenceDate,portfolios',
      );
      expect(lines[1].startsWith('12,12,Impact assessment,IA,')).toBe(true);
    });

    it('neutralises a definition that would run as a spreadsheet formula', async () => {
      const file = await service.export(GlossaryExportFormat.CSV);
      expect(file.body).toContain(`"'=HYPERLINK(""http://evil"")"`);
      expect(file.body).not.toMatch(/,=HYPERLINK/);
    });

    it('doubles the quotes inside a quoted cell', async () => {
      const file = await service.export(GlossaryExportFormat.CSV);
      expect(file.body).toContain('"Older, ""quoted"" definition"');
    });
  });

  describe('skos', () => {
    it('declares the scheme and one concept per term with a persistent URI', async () => {
      const file = await service.export(GlossaryExportFormat.SKOS);
      expect(file.contentType).toContain('text/turtle');
      expect(file.body).toContain('a skos:ConceptScheme');
      expect(file.body).toContain(
        '<https://clarisa.cgiar.org/glossary/term/12> a skos:Concept',
      );
      expect(file.body).toContain('skos:prefLabel "Impact assessment"@en');
      expect(file.body).toContain('skos:altLabel "IA"@en');
      expect(file.body).toContain(
        'dcterms:source <https://cgspace.cgiar.org/x>',
      );
      expect(file.body).toContain('dcterms:date "2021-11-01"^^xsd:date');
    });

    it('relates the versions of a concept to each other, not to themselves', async () => {
      const body = (await service.export(GlossaryExportFormat.SKOS)).body;
      const outcome13 = body
        .split('\n\n')
        .find((b) => b.includes('/term/13> a'));
      expect(outcome13).toContain(
        'skos:related <https://clarisa.cgiar.org/glossary/term/20>',
      );
      expect(outcome13).not.toContain(
        'skos:related <https://clarisa.cgiar.org/glossary/term/13>',
      );
    });

    it('escapes quotes and line breaks inside literals', async () => {
      const body = (await service.export(GlossaryExportFormat.SKOS)).body;
      expect(body).toContain('"Older, \\"quoted\\" definition"@en');
      expect(body).toContain('\\n');
      // No raw line break may survive inside a literal.
      for (const line of body.split('\n')) {
        const quotes = (line.replace(/\\"/g, '').match(/"/g) ?? []).length;
        expect(quotes % 2).toBe(0);
      }
    });
  });

  describe('toPlainText', () => {
    it('turns the stored markup into readable text and keeps link targets', () => {
      expect(
        service.toPlainText(
          'A study of <b>effects</b>.<br>See <a href=""https://example.org/ia"">the guide</a> &bull; done',
        ),
      ).toBe(
        'A study of effects.\nSee the guide (https://example.org/ia) • done',
      );
    });

    it('returns an empty string for an empty value', () => {
      expect(service.toPlainText(null)).toBe('');
      expect(service.toPlainText('')).toBe('');
    });
  });
});

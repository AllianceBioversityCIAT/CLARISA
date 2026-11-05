import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  GLOSSARY_COLLECTION_CODE,
  GlossaryTaxonomyLinksService,
} from './glossary-taxonomy-links.service';

describe('GlossaryTaxonomyLinksService', () => {
  const query = jest.fn();
  const service = new GlossaryTaxonomyLinksService({
    query,
  } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
  });

  it('reads the glossary collection of meliaf-taxonomy, public concepts only, by term_id', async () => {
    query.mockResolvedValue([]);
    await service.linksFor([391, 290]);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/^\s*SELECT/);
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/i);
    expect(sql).toContain('JOIN gc_collection_members');
    expect(sql).toContain('col.scheme_id = s.id');
    // Every value goes through a placeholder, never into the SQL text.
    expect(sql).not.toContain('391');
    expect(params).toEqual([
      'meliaf-taxonomy',
      GLOSSARY_COLLECTION_CODE,
      'approved',
      'deprecated',
      391,
      290,
    ]);
    expect((sql.match(/\?/g) ?? []).length).toBe(params.length);
  });

  it('builds the persistent URI from the scheme, honouring its uri_base', async () => {
    query.mockResolvedValue([
      {
        term_id: '391',
        status: 'approved',
        code: 'meliaf-taxonomy',
        uri_base: null,
      },
      {
        term_id: 354,
        status: 'deprecated',
        code: 'meliaf-taxonomy',
        uri_base: 'https://test.example.org/',
      },
    ]);
    const links = await service.linksFor([391, 354]);

    expect(links.get(391)).toEqual({
      termUri: 'https://api.clarisa.cgiar.org/meliaf-taxonomy/391',
      taxonomyStatus: 'approved',
    });
    expect(links.get(354)).toEqual({
      termUri: 'https://test.example.org/meliaf-taxonomy/354',
      taxonomyStatus: 'deprecated',
    });
  });

  it('a term with no concept in the taxonomy gets no link', async () => {
    query.mockResolvedValue([
      {
        term_id: 391,
        status: 'approved',
        code: 'meliaf-taxonomy',
        uri_base: null,
      },
    ]);
    const links = await service.linksFor([391, 400]);
    expect(links.has(400)).toBe(false);
    expect(links.size).toBe(1);
  });

  it('asks nothing for an empty page', async () => {
    await expect(service.linksFor([])).resolves.toEqual(new Map());
    expect(query).not.toHaveBeenCalled();
  });

  it('asks each id once and drops ids that are not numbers', async () => {
    query.mockResolvedValue([]);
    await service.linksFor([391, 391, Number.NaN, 290]);
    expect(query.mock.calls[0][1].slice(-2)).toEqual([391, 290]);
    expect(query.mock.calls[0][1]).toHaveLength(6);
  });

  it('linksForOrEmpty: a taxonomy that fails leaves no links and logs why', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    query.mockRejectedValue(new Error("Table 'gc_concepts' doesn't exist"));

    await expect(service.linksForOrEmpty([391])).resolves.toEqual(new Map());
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Table 'gc_concepts' doesn't exist"),
    );
    warn.mockRestore();
  });

  it('linksForOrEmpty: passes the links through when the taxonomy answers', async () => {
    query.mockResolvedValue([
      {
        term_id: 391,
        status: 'approved',
        code: 'meliaf-taxonomy',
        uri_base: null,
      },
    ]);
    const links = await service.linksForOrEmpty([391]);
    expect(links.get(391)?.taxonomyStatus).toBe('approved');
  });
});

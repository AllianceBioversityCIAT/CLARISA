import { instanceToPlain } from 'class-transformer';
import { Glossary } from './glossary.entity';
import { GlossaryPortfolio } from './glossary-portfolio.entity';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';

describe('Glossary serialization', () => {
  const buildAssociation = (
    portfolioId: number,
    name: string,
    acronym: string,
    isActive: boolean,
  ): GlossaryPortfolio => {
    const portfolio = new Portfolio();
    portfolio.id = portfolioId;
    portfolio.name = name;
    portfolio.acronym = acronym;

    const association = new GlossaryPortfolio();
    association.portfolio_id = portfolioId;
    association.portfolio_object = portfolio;
    association.auditableFields = { is_active: isActive } as any;

    return association;
  };

  const buildGlossary = (
    associations: GlossaryPortfolio[] | undefined,
  ): Glossary => {
    const glossary = new Glossary();
    glossary.id = 1;
    glossary.title = 'Action Area';
    glossary.definition = 'A definition';
    glossary.glossary_portfolio_array = associations;
    return glossary;
  };

  it('should expose portfolios of a term belonging to multiple portfolios', () => {
    const glossary = buildGlossary([
      buildAssociation(2, 'CGIAR portfolio 2022-2024', 'P22', true),
      buildAssociation(3, 'CGIAR portfolio 2025-2030', 'P25', true),
    ]);

    const plain = instanceToPlain(glossary);
    expect(plain.portfolios).toEqual([
      { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
      { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' },
    ]);
  });

  it('should omit inactive associations', () => {
    const glossary = buildGlossary([
      buildAssociation(2, 'CGIAR portfolio 2022-2024', 'P22', true),
      buildAssociation(3, 'CGIAR portfolio 2025-2030', 'P25', false),
    ]);

    const plain = instanceToPlain(glossary);
    expect(plain.portfolios).toEqual([
      { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
    ]);
  });

  it('should return an empty array when the term has no associations', () => {
    const plain = instanceToPlain(buildGlossary(undefined));
    expect(plain.portfolios).toEqual([]);
  });

  it('should not leak the raw relation nor the full portfolio entity', () => {
    const glossary = buildGlossary([
      buildAssociation(2, 'CGIAR portfolio 2022-2024', 'P22', true),
    ]);

    const plain = instanceToPlain(glossary);
    expect(plain.glossary_portfolio_array).toBeUndefined();
    expect(Object.keys(plain.portfolios[0]).sort()).toEqual([
      'acronym',
      'id',
      'name',
    ]);
  });

  it('should keep existing fields unchanged', () => {
    const plain = instanceToPlain(buildGlossary([]));
    expect(plain.term).toBe('Action Area');
    expect(plain.definition).toBe('A definition');
    expect(plain.id).toBeUndefined();
  });
});

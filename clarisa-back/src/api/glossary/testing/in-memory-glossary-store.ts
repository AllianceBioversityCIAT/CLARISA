import { GlossaryPortfolio } from '../entities/glossary-portfolio.entity';
import { Glossary } from '../entities/glossary.entity';
import { GlossaryActor, GlossaryStorage } from '../glossary-store';

/**
 * `GlossaryStorage` in memory, for specs: the same contract as `GlossaryStore`
 * (terms ordered by term like `ORDER BY preferred_label`, portfolios as ids)
 * without a database. `saves` records every write in order.
 */
export class InMemoryGlossaryStore implements GlossaryStorage {
  readonly rows = new Map<number, Glossary>();
  readonly portfolios = new Map<number, number[]>();
  readonly saves: { value: Glossary; actor?: GlossaryActor }[] = [];
  nextId = 1000;

  constructor(rows: Glossary[] = []) {
    for (const row of rows) this.put(row);
  }

  /** Adds a row as stored, its portfolios read from its active links. */
  put(row: Glossary): Glossary {
    this.rows.set(Number(row.id), row);
    this.portfolios.set(
      Number(row.id),
      (row.glossary_portfolio_array ?? [])
        .filter((gp) => gp.auditableFields?.is_active)
        .map((gp) => Number(gp.portfolio_id)),
    );
    return row;
  }

  /** No database: the work simply runs. */
  async transaction<T>(work: (manager?: undefined) => Promise<T>): Promise<T> {
    return work(undefined);
  }

  async all(): Promise<Glossary[]> {
    return [...this.rows.values()].sort(
      (a, b) =>
        String(a.title).localeCompare(String(b.title), 'en', {
          sensitivity: 'base',
        }) || Number(a.id) - Number(b.id),
    );
  }

  async byId(id: number): Promise<Glossary | null> {
    return this.rows.get(Number(id)) ?? null;
  }

  async portfolioIds(id: number): Promise<number[]> {
    return [...(this.portfolios.get(Number(id)) ?? [])];
  }

  async save(
    value: Glossary | Glossary[],
    _m?: unknown,
    actor?: GlossaryActor,
  ) {
    for (const g of Array.isArray(value) ? value : [value]) {
      if (g.id === undefined || g.id === null) g.id = this.nextId++;
      else if (!this.rows.has(Number(g.id)))
        throw new Error(`Glossary term ${g.id} was not found`);
      this.rows.set(Number(g.id), g);
      if (!this.portfolios.has(Number(g.id)))
        this.portfolios.set(Number(g.id), []);
      this.saves.push({ value: g, actor });
    }
  }

  async setPortfolios(id: number, portfolioIds: number[]) {
    this.portfolios.set(Number(id), [...new Set(portfolioIds.map(Number))]);
    const row = this.rows.get(Number(id));
    if (row) {
      row.glossary_portfolio_array = this.portfolios
        .get(Number(id))
        .map((pid) =>
          Object.assign(new GlossaryPortfolio(), {
            glossary_id: Number(id),
            portfolio_id: pid,
            auditableFields: { is_active: true },
          }),
        );
    }
  }
}

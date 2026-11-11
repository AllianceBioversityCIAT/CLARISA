import { ResyncGlossaryIntoTaxonomy1794000000000 as Migration } from '../../../migrations/1794000000000-ResyncGlossaryIntoTaxonomy';

/**
 * After the cutover gc_concepts is the only live copy of the glossary. An
 * empty down() let `migration:revert` + `migration:run` replay up() and
 * overwrite later edits with the stale `glossary` table (2026-11-11), so
 * down() refuses instead.
 */
describe('ResyncGlossaryIntoTaxonomy1794000000000', () => {
  it('down() refuses to run: it throws and sends no query', async () => {
    const query = jest.fn();
    const migration = new Migration() as any;
    await expect(migration.down({ query })).rejects.toThrow(
      /cannot be reverted/,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('keeps its class name and migration name', () => {
    expect(Migration.name).toBe('ResyncGlossaryIntoTaxonomy1794000000000');
    expect(new Migration().name).toBe(
      'ResyncGlossaryIntoTaxonomy1794000000000',
    );
  });
});

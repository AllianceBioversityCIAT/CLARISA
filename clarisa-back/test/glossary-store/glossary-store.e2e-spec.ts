/**
 * The glossary written and read through the taxonomy (`GlossaryStore`) on a
 * real MySQL, the way the admin panel does it. Writes, so it only runs
 * against a disposable database that already holds the glossary copy
 * (migrations up to ResyncGlossaryIntoTaxonomy1794000000000):
 *
 *   DB_HOST=… DB_PORT=… DB_USER=… DB_PASS=… DB_NAME=… \
 *   GLOSSARY_STORE_E2E=1 npm run glossary:store
 *
 * Without `GLOSSARY_STORE_E2E=1` every test is skipped.
 */
import { DataSource } from 'typeorm';
import { dataSource } from '../../src/ormconfig';
import { GlossaryStore } from '../../src/api/glossary/glossary-store';
import { GlossaryAdminService } from '../../src/api/glossary/glossary-admin.service';
import { GlossaryService } from '../../src/api/glossary/glossary.service';
import { FindAllOptions } from '../../src/shared/entities/enums/find-all-options';
import { GlossaryEditorialStatus } from '../../src/api/glossary/entities/glossary.entity';
import { GlossaryBulkConflictPolicy } from '../../src/api/glossary/dto/glossary-admin.dto';
import { instanceToPlain } from 'class-transformer';

const RUN = process.env.GLOSSARY_STORE_E2E === '1';
const describeIf = RUN ? describe : describe.skip;
const user = { userId: 1, email: 'bench@cgiar.org', permissions: '/api/' };

describeIf('glossary on the taxonomy, real MySQL', () => {
  let ds: DataSource;
  let store: GlossaryStore;
  let admin: GlossaryAdminService;
  let read: GlossaryService;
  let tableBefore: string;
  const sql = async <T = any>(q: string, p: unknown[] = []) =>
    (await ds.query(q, p)) as T[];
  // One hash per row, computed in SQL: no GROUP_CONCAT, whose length limit
  // is per connection and would differ between two connections of the pool.
  const tableChecksum = async () =>
    JSON.stringify({
      rows: await sql(
        `SELECT id, MD5(CONCAT_WS('|', title, definition, is_active, editorial_status,
                IFNULL(replaced_by_id, ''), IFNULL(alternative_labels, ''),
                IFNULL(updated_at, ''), IFNULL(group_id, ''))) AS h
           FROM glossary ORDER BY id`,
      ),
      links: await sql(
        `SELECT id, glossary_id, portfolio_id, is_active FROM glossary_portfolios ORDER BY id`,
      ),
    });
  const concept = async (termId: number) =>
    (
      await sql(
        `SELECT c.* FROM gc_concepts c JOIN gc_schemes s ON s.id = c.scheme_id
          WHERE s.code = 'meliaf-taxonomy' AND c.term_id = ?`,
        [termId],
      )
    )[0];
  const v1 = async (show = FindAllOptions.SHOW_ONLY_ACTIVE) =>
    (await read.findAll(show)).map((g) => instanceToPlain(g));

  beforeAll(async () => {
    ds = await dataSource.initialize();
    store = new GlossaryStore(ds);
    admin = new GlossaryAdminService(store, ds);
    read = new GlossaryService(store);
    tableBefore = await tableChecksum();
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  let created: number;

  it('create: a new term takes the next TERM ID of the taxonomy and shows in v1 as before', async () => {
    const [{ next_term_id: next }] = await sql(
      `SELECT next_term_id FROM gc_schemes WHERE code = 'meliaf-taxonomy'`,
    );
    const dto = await admin.create(
      {
        term: '  Bench   created term ',
        definition: 'Made by the panel on the taxonomy.',
        portfolio_ids: [3],
        alternative_labels: ['BCT', 'bct', 'Bench created term'],
        source: 'Bench',
        reference_date: '2026-11-06',
        show_in_dashboard: true,
      } as any,
      user,
    );
    created = dto.id;
    expect(created).toBe(Number(next));
    expect(dto.term).toBe('Bench created term');
    expect(dto.alternative_labels).toEqual(['BCT']);
    const row = (await v1()).find((t) => t.termId === created);
    expect(row).toEqual({
      term: 'Bench created term',
      definition: 'Made by the panel on the taxonomy.',
      source: 'Bench',
      sourceUrl: null,
      referenceDate: '2026-11-06',
      groupId: created,
      termId: created,
      editorialStatus: 'approved',
      replacedByTermId: null,
      alternativeLabels: ['BCT'],
      portfolios: [
        expect.objectContaining({ id: 3, acronym: expect.any(String) }),
      ],
    });
    const c = await concept(created);
    expect(c.status).toBe('approved');
    expect(c.created_by_email).toBe('bench@cgiar.org');
    const [member] = await sql(
      `SELECT col.code FROM gc_collection_members m JOIN gc_collections col ON col.id = m.collection_id WHERE m.concept_id = ?`,
      [c.id],
    );
    expect(member.code).toBe('glossary');
    // `create`, then the portfolios the panel assigns in a second step.
    const history = await sql(
      `SELECT action, changes FROM gc_history WHERE concept_id = ? ORDER BY id`,
      [c.id],
    );
    expect(history.map((h) => h.action)).toEqual(['create', 'update']);
    expect(JSON.parse(history[1].changes)).toEqual({
      portfolios: { from: [], to: [3] },
    });
    // The dashboard list carries it too.
    expect(
      (await read.findAll(FindAllOptions.SHOW_ONLY_ACTIVE, true)).some(
        (g) => Number(g.id) === created,
      ),
    ).toBe(true);
  });

  it('two creates at the same time get two different TERM IDs', async () => {
    const [a, b] = await Promise.all([
      admin.create(
        { term: 'Bench twin A', definition: 'A', portfolio_ids: [] } as any,
        user,
      ),
      admin.create(
        { term: 'Bench twin B', definition: 'B', portfolio_ids: [] } as any,
        user,
      ),
    ]);
    expect(a.id).not.toBe(b.id);
    expect((await concept(a.id)).preferred_label).toBe('Bench twin A');
    expect((await concept(b.id)).preferred_label).toBe('Bench twin B');
  });

  it('update: definition and labels change in v1, the concept version is revised and logged', async () => {
    await admin.update(
      created,
      {
        definition: 'Edited by the panel.',
        alternative_labels: ['Edited label'],
      } as any,
      user,
    );
    const row = (await v1()).find((t) => t.termId === created);
    expect(row.definition).toBe('Edited by the panel.');
    expect(row.alternativeLabels).toEqual(['Edited label']);
    const c = await concept(created);
    expect(c.version).toBe('1.1');
    const [last] = await sql(
      `SELECT action, changes FROM gc_history WHERE concept_id = ? ORDER BY id DESC LIMIT 1`,
      [c.id],
    );
    expect(last.action).toBe('update');
    expect(JSON.parse(last.changes).definition.to).toBe('Edited by the panel.');
  });

  it('the admin list shows who changed it last and when', async () => {
    const dto = await admin.findOneForAdmin(created);
    expect(dto.last_modified_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dto.is_active).toBe(true);
    expect(dto.show_in_dashboard).toBe(true);
  });

  it('setStatus(false): leaves the active list, enters the inactive one, concept deprecated', async () => {
    await admin.setStatus(created, false, user);
    expect((await v1()).some((t) => t.termId === created)).toBe(false);
    expect(
      (await v1(FindAllOptions.SHOW_ONLY_INACTIVE)).some(
        (t) => t.termId === created,
      ),
    ).toBe(true);
    expect((await concept(created)).status).toBe('deprecated');
    await admin.setStatus(created, true, user);
    expect((await concept(created)).status).toBe('approved');
  });

  it('editorial status deprecated with a replacement: v1 points at the replacement termId', async () => {
    const target = (await v1()).find((t) => t.termId === 391);
    expect(target).toBeDefined();
    await admin.setEditorialStatus(
      created,
      { status: GlossaryEditorialStatus.DEPRECATED, replaced_by_id: 391 },
      user,
    );
    const row = (await v1()).find((t) => t.termId === created);
    expect(row.editorialStatus).toBe('deprecated');
    expect(row.replacedByTermId).toBe(391);
    const c = await concept(created);
    const replacement = await concept(391);
    expect(Number(c.replaced_by_id)).toBe(Number(replacement.id));
    await admin.setEditorialStatus(
      created,
      { status: GlossaryEditorialStatus.APPROVED } as any,
      user,
    );
    expect(
      (await v1()).find((t) => t.termId === created).replacedByTermId,
    ).toBe(null);
  });

  it('split, merge and group: versions per portfolio keep working', async () => {
    await admin.update(created, { portfolio_ids: [2, 3] } as any, user);
    const { version } = await admin.splitVersion(
      created,
      { portfolio_ids: [2], definition: 'The P22 version.' } as any,
      user,
    );
    const rows = await v1();
    const source = rows.find((t) => t.termId === created);
    const split = rows.find((t) => t.termId === version.id);
    expect(source.portfolios.map((p: any) => p.id)).toEqual([3]);
    expect(split.portfolios.map((p: any) => p.id)).toEqual([2]);
    expect(split.groupId).toBe(source.groupId);
    expect(split.term).toBe(source.term);

    await admin.mergeInto(version.id, created, user);
    const after = await v1(FindAllOptions.SHOW_ALL);
    expect(
      after
        .find((t) => t.termId === created)
        .portfolios.map((p: any) => p.id)
        .sort(),
    ).toEqual([2, 3]);
    expect(
      (await v1(FindAllOptions.SHOW_ONLY_INACTIVE)).some(
        (t) => t.termId === version.id,
      ),
    ).toBe(true);

    await admin.clearGroup(version.id, user);
    expect((await admin.findOneForAdmin(version.id)).group_id).toBe(version.id);
  });

  it('bulk import: creates and updates in one transaction', async () => {
    const result = await admin.bulkImport(
      {
        rows: [
          { term: 'Bench created term', definition: 'Bulk edit.' },
          { term: 'Bench bulk new', definition: 'Bulk new.' },
        ],
        portfolio_ids: [3],
        on_conflict: GlossaryBulkConflictPolicy.UPDATE,
      } as any,
      user,
    );
    expect(result.summary.to_create).toBe(1);
    expect(result.summary.to_update).toBe(1);
    const rows = await v1();
    expect(rows.find((t) => t.termId === created).definition).toBe(
      'Bulk edit.',
    );
    expect(rows.find((t) => t.term === 'Bench bulk new')).toBeDefined();
  });

  it('a status changed from the taxonomy side (its panel, a proposal) shows in v1', async () => {
    await sql(`UPDATE gc_concepts SET status = 'deprecated' WHERE id = ?`, [
      (await concept(created)).id,
    ]);
    expect((await v1()).some((t) => t.termId === created)).toBe(false);
    expect(
      (await v1(FindAllOptions.SHOW_ONLY_INACTIVE)).some(
        (t) => t.termId === created,
      ),
    ).toBe(true);
    // The panel sees it inactive too, and reactivating it from there works.
    expect((await admin.findOneForAdmin(created)).is_active).toBe(false);
    await admin.setStatus(created, true, user);
    expect((await concept(created)).status).toBe('approved');
  });

  it('a term that is not in the glossary cannot be edited', async () => {
    await expect(
      admin.update(999999, { definition: 'x' } as any, user),
    ).rejects.toThrow(/was not found/);
  });

  it('the old glossary table was not written by any of the above', async () => {
    expect(await tableChecksum()).toBe(tableBefore);
  });
});

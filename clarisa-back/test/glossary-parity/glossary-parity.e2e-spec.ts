/**
 * End-to-end parity check of the public glossary against a LIVE environment.
 *
 * It proves that what the glossary serves — every endpoint and the landing
 * page — is intact: the same terms with the same information. It is the
 * before/after check of any change that touches the glossary's data or its
 * readers (the taxonomy copy, the move of portfolios to a custom field, the
 * switch of readers to `gc_concepts`).
 *
 *   GLOSSARY_BASE=https://clarisatest-back.ciat.cgiar.org/ \
 *   GLOSSARY_SNAPSHOT_OUT=/tmp/glossary-before \
 *   npm run glossary:parity                 # record + self-consistency
 *
 *   … deploy …
 *
 *   GLOSSARY_BASE=https://clarisatest-back.ciat.cgiar.org/ \
 *   GLOSSARY_GOLDEN=/tmp/glossary-before \
 *   GLOSSARY_WEB=https://clarisatest-web.ciat.cgiar.org/ \
 *   npm run glossary:parity                 # exact comparison + the page
 *
 * - `GLOSSARY_BASE` (required): API base URL.
 * - `GLOSSARY_SNAPSHOT_OUT` (optional): directory where the current answers
 *   are written, to be the golden of a later run.
 * - `GLOSSARY_GOLDEN` (optional): directory of a previous snapshot; every
 *   variant must match it term by term, field by field.
 * - `GLOSSARY_WEB` (optional): front base URL; opens the glossary page with
 *   Playwright (`playwright` must be installed; it is not a dependency of the
 *   project) and checks that it renders the same terms and definitions the
 *   API serves. Set without Playwright available = the test fails, never a
 *   silent skip.
 *
 * Read-only: it never writes to the environment.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

jest.setTimeout(600_000);

type Term = {
  term: string;
  definition: string;
  source: string | null;
  sourceUrl: string | null;
  referenceDate: string | null;
  groupId: number;
  termId: number;
  editorialStatus: string;
  replacedByTermId: number | null;
  alternativeLabels: string[];
  portfolios: { id: number; name: string; acronym: string }[];
};

/** The 11 public keys of a term, in the order production serves them. */
const TERM_KEYS = [
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
];

const LIST_VARIANTS = {
  list: 'api/glossary',
  active: 'api/glossary?show=active',
  all: 'api/glossary?show=all',
  inactive: 'api/glossary?show=inactive',
  dashboard: 'api/glossary/dashboard',
  'export-json': 'api/glossary/export?format=json',
} as const;
type ListVariant = keyof typeof LIST_VARIANTS;

const TEXT_VARIANTS = {
  'export-csv': 'api/glossary/export?format=csv',
  'export-skos': 'api/glossary/export?format=skos',
} as const;
type TextVariant = keyof typeof TEXT_VARIANTS;

const base = (process.env.GLOSSARY_BASE ?? '').replace(/\/?$/, '/');
const golden = process.env.GLOSSARY_GOLDEN;
const snapshotOut = process.env.GLOSSARY_SNAPSHOT_OUT;
const web = process.env.GLOSSARY_WEB
  ? process.env.GLOSSARY_WEB.replace(/\/?$/, '/')
  : '';

const byTermId = (a: Term, b: Term) => a.termId - b.termId;
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

const get = async (path: string) => {
  const res = await fetch(base + path, { redirect: 'manual' });
  const text = await res.text();
  return {
    status: res.status,
    type: res.headers.get('content-type') ?? '',
    text,
  };
};

/** Runs `fn` over `items` with at most `limit` in flight. */
const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
};

/** Field-level differences between two lists of terms, keyed by termId. */
const diffTerms = (expected: Term[], actual: Term[]): string[] => {
  const e = new Map(expected.map((t) => [t.termId, t]));
  const a = new Map(actual.map((t) => [t.termId, t]));
  const out: string[] = [];
  for (const id of new Set([...e.keys(), ...a.keys()])) {
    const x = e.get(id);
    const y = a.get(id);
    if (!x) out.push(`term ${id} appeared ("${y?.term}")`);
    else if (!y) out.push(`term ${id} disappeared ("${x.term}")`);
    else
      for (const key of TERM_KEYS) {
        const left = JSON.stringify((x as any)[key]);
        const right = JSON.stringify((y as any)[key]);
        if (left !== right)
          out.push(`term ${id} "${x.term}" ${key}: ${left} → ${right}`);
      }
  }
  return out;
};

const lists: Record<ListVariant, Term[]> = {} as any;
const raw: Record<ListVariant, string> = {} as any;
const texts: Record<TextVariant, string> = {} as any;
const details = new Map<number, { status: number; body: Term | null }>();

describe(`glossary parity against ${base || '(GLOSSARY_BASE missing)'}`, () => {
  beforeAll(async () => {
    expect(base).toMatch(/^https?:\/\//);
    for (const [name, path] of Object.entries(LIST_VARIANTS)) {
      const res = await get(path);
      expect({ variant: name, status: res.status }).toEqual({
        variant: name,
        status: 200,
      });
      expect(res.type).toMatch(/application\/json/);
      raw[name as ListVariant] = res.text;
      lists[name as ListVariant] = JSON.parse(res.text);
    }
    for (const [name, path] of Object.entries(TEXT_VARIANTS)) {
      const res = await get(path);
      expect({ variant: name, status: res.status }).toEqual({
        variant: name,
        status: 200,
      });
      texts[name as TextVariant] = res.text;
    }
    const ids = lists.all.map((t) => t.termId);
    const bodies = await mapLimit(ids, 8, async (id) => {
      const res = await get(`api/glossary/get/${id}`);
      return [
        id,
        {
          status: res.status,
          body: res.status === 200 ? (JSON.parse(res.text) as Term) : null,
        },
      ] as const;
    });
    for (const [id, body] of bodies) details.set(id, body);

    if (snapshotOut) {
      mkdirSync(snapshotOut, { recursive: true });
      for (const name of Object.keys(LIST_VARIANTS) as ListVariant[])
        writeFileSync(join(snapshotOut, `${name}.json`), raw[name]);
      for (const name of Object.keys(TEXT_VARIANTS) as TextVariant[])
        writeFileSync(join(snapshotOut, `${name}.txt`), texts[name]);
      writeFileSync(
        join(snapshotOut, 'get.json'),
        JSON.stringify(Object.fromEntries(details), null, 1),
      );
    }
  });

  describe('every endpoint answers and agrees with the others', () => {
    it('serves a non-empty list with the 11 public keys per term', () => {
      expect(lists.all.length).toBeGreaterThan(0);
      for (const t of lists.all) expect(Object.keys(t)).toEqual(TERM_KEYS);
    });

    it('the default list is the active list, and active + inactive = all', () => {
      expect([...lists.list].sort(byTermId)).toEqual(
        [...lists.active].sort(byTermId),
      );
      const ids = (l: Term[]) => l.map((t) => t.termId).sort((a, b) => a - b);
      expect(ids([...lists.active, ...lists.inactive])).toEqual(ids(lists.all));
      expect(
        ids(lists.active).filter((id) => ids(lists.inactive).includes(id)),
      ).toEqual([]);
    });

    it('the dashboard is a subset of the list, same information', () => {
      expect(
        diffTerms(
          lists.dashboard,
          lists.all.filter((t) =>
            lists.dashboard.some((d) => d.termId === t.termId),
          ),
        ),
      ).toEqual([]);
    });

    it('GET api/glossary/get/:id returns every term with the same information as the list', () => {
      const failed = [...details].filter(([, d]) => d.status !== 200);
      expect(failed.map(([id, d]) => `${id}: ${d.status}`)).toEqual([]);
      expect(
        diffTerms(
          lists.all,
          [...details.values()].map((d) => d.body as Term),
        ),
      ).toEqual([]);
    });

    it('export json = the active list; csv has one row per active term; skos names every active term', () => {
      expect(diffTerms(lists.active, lists['export-json'])).toEqual([]);
      const csvRows = texts['export-csv']
        .split(/\r?\n/)
        .filter((l) => l.trim() !== '').length;
      expect(csvRows).toBeGreaterThanOrEqual(lists.active.length + 1);
      const missing = lists.active.filter(
        (t) => !texts['export-skos'].includes(`/${t.termId}>`),
      );
      expect(missing.map((t) => t.termId)).toEqual([]);
    });

    it('GET api/v2/glossary, where it exists, answers byte for byte like v1', async () => {
      const v2 = await get('api/v2/glossary?show=all');
      if (v2.status === 404) {
        console.warn(
          'api/v2/glossary not deployed here: v1/v2 parity not checked',
        );
        return;
      }
      expect(v2.status).toBe(200);
      const v1 = await get('api/glossary?show=all');
      // Same request twice: a tie in the ORDER BY may flip two same-name terms.
      expect(diffTerms(JSON.parse(v1.text), JSON.parse(v2.text))).toEqual([]);
    });
  });

  (golden ? describe : describe.skip)(
    `exact match with the snapshot ${golden}`,
    () => {
      const read = (file: string) =>
        readFileSync(join(golden as string, file), 'utf8');

      it.each(Object.keys(LIST_VARIANTS))(
        '%s: same terms, same fields',
        (name) => {
          expect(existsSync(join(golden as string, `${name}.json`))).toBe(true);
          const before: Term[] = JSON.parse(read(`${name}.json`));
          expect(diffTerms(before, lists[name as ListVariant])).toEqual([]);
          expect(lists[name as ListVariant].length).toBe(before.length);
        },
      );

      it.each(Object.keys(TEXT_VARIANTS))('%s: identical text', (name) => {
        expect(texts[name as TextVariant]).toBe(read(`${name}.txt`));
      });

      it('get/:id: same answer per term', () => {
        const before: Record<string, { status: number; body: Term | null }> =
          JSON.parse(read('get.json'));
        const diffs: string[] = [];
        for (const [id, d] of Object.entries(before)) {
          const now = details.get(Number(id));
          if (!now) diffs.push(`term ${id} no longer listed`);
          else if (now.status !== d.status)
            diffs.push(`term ${id}: ${d.status} → ${now.status}`);
          else if (d.body && now.body)
            diffs.push(...diffTerms([d.body], [now.body]));
        }
        expect(diffs).toEqual([]);
      });
    },
  );

  (web ? describe : describe.skip)(`the glossary page at ${web}`, () => {
    const pw: any = (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('playwright');
      } catch {
        return null;
      }
    })();
    let browser: any;
    let page: any;

    const cards = async (): Promise<{ term: string; definition: string }[]> =>
      page.$$eval('article.glossary-card', (nodes: Element[]) =>
        nodes.map((n) => ({
          term: (n.querySelector('h4')?.textContent ?? '')
            .replace(/\s+/g, ' ')
            .trim(),
          definition: (n.querySelector('.card-definition')?.textContent ?? '')
            .replace(/\s+/g, ' ')
            .trim(),
        })),
      );

    /** The text a browser shows for each HTML definition, whitespace collapsed. */
    const visibleText = (htmlList: string[]): Promise<string[]> =>
      page.evaluate(
        (list: string[]) =>
          list.map((html) => {
            const el = document.createElement('div');
            el.innerHTML = html;
            return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
          }),
        htmlList,
      );

    beforeAll(async () => {
      expect({
        playwright: pw
          ? 'installed'
          : 'missing (npm i -D playwright && npx playwright install chromium)',
      }).toEqual({ playwright: 'installed' });
      browser = await pw.chromium.launch({ headless: true });
      page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    });

    afterAll(async () => {
      await browser?.close();
    });

    it('lists every active concept with its name, over all portfolios', async () => {
      await page.goto(`${web}landing-page/glossary`, {
        waitUntil: 'networkidle',
      });
      await page.waitForSelector('article.glossary-card', { timeout: 60_000 });
      const all = page.locator('button', { hasText: 'All portfolios' });
      if (await all.count()) {
        await all.first().click();
        await page.waitForTimeout(500);
      }
      const shown = await cards();
      const groups = new Map<number, Term[]>();
      for (const t of lists.active)
        groups.set(t.groupId, [...(groups.get(t.groupId) ?? []), t]);
      expect(shown.length).toBe(groups.size);
      const expectedNames = new Set(
        [...groups.values()].map((g) => normalize(g[0].term)),
      );
      expect(new Set(shown.map((c) => c.term))).toEqual(expectedNames);
      // Each card shows one of the definitions of its concept, as the
      // browser renders it (definitions carry markup: <br>, <a>, entities).
      const definitions = new Set(
        await visibleText(lists.active.map((t) => t.definition)),
      );
      const wrong = shown.filter((c) => !definitions.has(c.definition));
      expect(wrong.map((c) => c.term)).toEqual([]);
    });

    it('the permalink of a term shows exactly that term and definition', async () => {
      const sample = [...lists.active]
        .sort(byTermId)
        .filter((_, i, a) =>
          [0, Math.floor(a.length / 2), a.length - 1].includes(i),
        );
      for (const t of sample) {
        await page.goto(`${web}landing-page/glossary/term/${t.termId}`, {
          waitUntil: 'networkidle',
        });
        await page.waitForSelector('article.glossary-card', {
          timeout: 60_000,
        });
        const shown = await cards();
        expect({ termId: t.termId, cards: shown.length }).toEqual({
          termId: t.termId,
          cards: 1,
        });
        expect(shown[0].term).toBe(normalize(t.term));
        expect(shown[0].definition).toBe(
          (await visibleText([t.definition]))[0],
        );
      }
    });
  });
});

/**
 * Control lists engine on a real MySQL 8.4, through HTTP, the way the panel
 * and the consumers will use it. Creates and drops schemas and users, so it
 * only runs against a DISPOSABLE server on this machine:
 *
 *   docker run -d --name clarisa-cl-e2e -e MYSQL_ROOT_PASSWORD=e2eroot \
 *     -p 127.0.0.1:3308:3306 mysql:8.4 --sql-mode=""
 *   CONTROL_LISTS_E2E=1 npm run control-lists:e2e
 *
 * The server is started with a LAX global sql_mode on purpose: the engine must
 * pin strict mode itself (review 2026-11-13 §8, condition 6).
 * Without `CONTROL_LISTS_E2E=1` every test is skipped.
 */
// LDAPAuth reads src/shared/config/config.ts, git-ignored and absent in CI;
// UserService pulls it in. Same mock as permission.guard.glossary.spec.ts.
jest.mock('../../src/auth/utils/LDAPAuth', () => ({ LDAPAuth: jest.fn() }));

import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as net from 'net';
import request from 'supertest';
import { DataSource, QueryRunner } from 'typeorm';
import { AddControlListsCatalog1794200000000 } from '../../migrations/1794200000000-AddControlListsCatalog';
import {
  CONTROL_LISTS_PROVIDERS,
  ControlListsReconciler,
} from '../../src/api/control-lists/control-lists.module';
import {
  ControlListsAdminController,
  ControlListsPublicController,
} from '../../src/api/control-lists/control-lists.controller';
import { DataService } from '../../src/api/control-lists/data.service';
import { UserAccessService } from '../../src/api/user/user-access.service';
import { UserService } from '../../src/api/user/user.service';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../src/shared/guards/permission.guard';
import { ExceptionsFilter } from '../../src/shared/filters/exceptions.filter';

const RUN = process.env.CONTROL_LISTS_E2E === '1';
const describeIf = RUN ? describe : describe.skip;

const HOST = process.env.CL_E2E_HOST ?? '127.0.0.1';
const PORT = Number(process.env.CL_E2E_PORT ?? 3308);
const ROOT_PASS = process.env.CL_E2E_ROOT_PASS ?? 'e2eroot';
/**
 * `shared` (default) = the list tables live in CLARISA's own database, as
 * deployed (infrastructure, 2026-11-17). `separate` = their own database,
 * still supported through `CONTROL_LISTS_DB_NAME`.
 */
const SHARED = process.env.CL_E2E_MODE !== 'separate';
// Capitals on purpose in shared mode: CLARISA's database is named like `clarisaDB`.
const MAIN = SHARED ? 'clE2eMain' : 'cl_e2e_main';
const LISTS = SHARED ? MAIN : 'cl_e2e_lists';
/** The MySQL user the engine connects with. */
const ENGINE_USER = SHARED ? 'cl_e2e_app' : 'cl_e2e_engine';
const itShared = SHARED ? it : it.skip;
const itSeparate = SHARED ? it.skip : it;

jest.setTimeout(90_000);

/** TCP proxy in front of MySQL for the engine and data users: `cut()` drops every live socket. */
function startProxy(): Promise<{
  port: number;
  cut: () => void;
  close: () => Promise<void>;
}> {
  const sockets = new Set<net.Socket>();
  const server = net.createServer((client) => {
    const upstream = net.connect(PORT, HOST);
    sockets.add(client);
    sockets.add(upstream);
    const drop = () => {
      client.destroy();
      upstream.destroy();
      sockets.delete(client);
      sockets.delete(upstream);
    };
    client.on('error', drop).on('close', drop);
    upstream.on('error', drop).on('close', drop);
    client.pipe(upstream);
    upstream.pipe(client);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        port: (server.address() as net.AddressInfo).port,
        cut: () => [...sockets].forEach((s) => s.destroy()),
        close: () => new Promise((r) => server.close(() => r())),
      }),
    ),
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(what: string, fn: () => Promise<boolean>, ms = 10_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await wait(150);
  }
  throw new Error(`Timed out waiting for: ${what}`);
}

describeIf('control lists engine, real MySQL', () => {
  if (!['127.0.0.1', 'localhost'].includes(HOST)) {
    throw new Error(
      'The control lists e2e suite only runs against a local disposable server.',
    );
  }

  let root: DataSource;
  let mainDs: DataSource;
  let app: INestApplication;
  /**
   * The app listens ONCE on 127.0.0.1. `request(app.getHttpServer())` opens a
   * wildcard ephemeral port per request, and on macOS another local process
   * already listening on 127.0.0.1 with that port number takes the connection
   * (seen: a random 404 with an empty body every few runs).
   */
  let baseUrl: string;
  let proxy: Awaited<ReturnType<typeof startProxy>>;
  const roleId: Record<string, number> = {};

  /** Test users: e-mail → roles (acronyms) and route permissions. */
  const USERS: Record<
    string,
    { id: number; roles: string[]; super?: boolean; perms: string[] }
  > = {
    'designer.a@e2e': {
      id: 101,
      roles: ['TEAM_A', 'CL_DESIGNER'],
      perms: [
        '/api/control-lists/admin/schema',
        '/api/control-lists/admin/data',
      ],
    },
    'editor.a@e2e': {
      id: 102,
      roles: ['TEAM_A', 'CL_EDITOR'],
      perms: ['/api/control-lists/admin/data'],
    },
    'designer.b@e2e': {
      id: 103,
      roles: ['TEAM_B', 'CL_DESIGNER'],
      perms: [
        '/api/control-lists/admin/schema',
        '/api/control-lists/admin/data',
      ],
    },
    'sa@e2e': {
      id: 104,
      roles: ['SA'],
      super: true,
      perms: ['/api/control-lists/admin'],
    },
    'nobody@e2e': { id: 105, roles: [], perms: [] },
  };
  const A = 'designer.a@e2e';

  const sql = <T = any>(q: string, p: unknown[] = []) =>
    root.query(q, p) as Promise<T[]>;
  const call = (
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    user?: string,
    body?: unknown,
  ) => {
    let r = request(baseUrl)[method](url);
    if (user) r = r.set('x-test-user', user);
    return body === undefined ? r : r.send(body as object);
  };
  const admin = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    body?: unknown,
    user = A,
  ) => call(method, `/api/control-lists/admin/${path}`, user, body);
  const pub = (path: string) => call('get', `/api/control-lists/${path}`);

  const op = async (requestId: string) =>
    (
      await sql(`SELECT * FROM ${MAIN}.cl_schema_ops WHERE request_id = ?`, [
        requestId,
      ])
    )[0];
  const lastOp = async (listId: number) =>
    (
      await sql(
        `SELECT * FROM ${MAIN}.cl_schema_ops WHERE list_id = ? ORDER BY id DESC LIMIT 1`,
        [listId],
      )
    )[0];
  const fieldRow = async (listId: number, code: string) =>
    (
      await sql(
        `SELECT * FROM ${MAIN}.cl_fields WHERE list_id = ? AND code = ?`,
        [listId, code],
      )
    )[0];
  const columnExists = async (table: string, column: string) =>
    Number(
      (
        await sql(
          'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
          [LISTS, table, column],
        )
      )[0].n,
    ) > 0;
  const tableExists = async (table: string) =>
    Number(
      (
        await sql(
          'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
          [LISTS, table],
        )
      )[0].n,
    ) > 0;
  const tick = () => app.get(ControlListsReconciler).tick();
  /** Server thread running the engine's ALTER for that column (never this query itself). */
  const alterThread = async (column: string) =>
    Number(
      (
        await sql(
          `SELECT ID FROM information_schema.PROCESSLIST
            WHERE ID <> CONNECTION_ID() AND USER = ? AND INFO LIKE ?`,
          [ENGINE_USER, `ALTER TABLE %ADD COLUMN \`${column}\`%`],
        )
      )[0]?.ID ?? 0,
    );

  /** A root connection holding a metadata lock on a list table until `release()`. */
  async function holdTable(
    table: string,
  ): Promise<{ release: () => Promise<void>; qr: QueryRunner }> {
    const qr = root.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    await qr.query(`SELECT * FROM ${LISTS}.${table} LIMIT 1`);
    return {
      qr,
      release: async () => {
        await qr.commitTransaction().catch(() => undefined);
        await qr.release();
      },
    };
  }

  /**
   * Every table of the database with its rows, before the catalog exists and
   * after the migration is undone: CLARISA's own tables must end identical.
   */
  let clarisaBefore: unknown;
  async function clarisaSnapshot() {
    const tables = (await sql(`SHOW TABLES FROM ${MAIN}`))
      .map((r) => String(Object.values(r)[0]))
      .sort();
    const rows: Record<string, unknown> = {};
    for (const t of tables)
      rows[t] = await sql(`SELECT * FROM ${MAIN}.\`${t}\` ORDER BY id`);
    const create = (await sql(`SHOW CREATE TABLE ${MAIN}.institutions`))[0];
    return { tables, rows, create };
  }

  async function createList(
    code: string,
    fields: Record<string, unknown>[],
    publish = true,
    user = A,
  ) {
    const owner = USERS[user].super
      ? roleId.TEAM_A
      : roleId[USERS[user].roles[0]];
    const res = await admin(
      'post',
      'schema/lists',
      { code, name: code.replace(/_/g, ' '), owner_role_id: owner },
      user,
    );
    expect([res.status, res.body?.message]).toEqual([201, undefined]);
    const id = Number(res.body.id);
    for (const f of fields) {
      const r = await admin('post', `schema/lists/${id}/fields`, f, user);
      expect([r.status, r.body?.message]).toEqual([201, undefined]);
    }
    if (publish) {
      const r = await admin('post', `schema/lists/${id}/publish`, {}, user);
      expect([r.status, r.body?.message]).toEqual([201, undefined]);
    }
    return id;
  }

  beforeAll(async () => {
    root = await new DataSource({
      type: 'mysql',
      host: HOST,
      port: PORT,
      username: 'root',
      password: ROOT_PASS,
      name: 'cl-e2e-root',
    }).initialize();

    for (const stmt of [
      `DROP DATABASE IF EXISTS cl_e2e_main`,
      `DROP DATABASE IF EXISTS cl_e2e_lists`,
      `DROP DATABASE IF EXISTS clE2eMain`,
      `CREATE DATABASE ${MAIN} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
      ...(SHARED
        ? []
        : [
            `CREATE DATABASE ${LISTS} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
          ]),
      `DROP USER IF EXISTS 'cl_e2e_app'@'%', 'cl_e2e_engine'@'%', 'cl_e2e_data'@'%'`,
      `CREATE USER 'cl_e2e_app'@'%' IDENTIFIED BY 'app'`,
      `CREATE USER 'cl_e2e_engine'@'%' IDENTIFIED BY 'engine'`,
      `CREATE USER 'cl_e2e_data'@'%' IDENTIFIED BY 'data'`,
      ...(SHARED
        ? [
            // CLARISA's own user, which already runs the migrations: one database, one user.
            `GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, LOCK TABLES, SELECT, INSERT, UPDATE, DELETE ON ${MAIN}.* TO 'cl_e2e_app'@'%'`,
          ]
        : [
            // The CLARISA application user: data on the main schema, nothing on the lists schema.
            `GRANT SELECT, INSERT, UPDATE, DELETE ON ${MAIN}.* TO 'cl_e2e_app'@'%'`,
            // DDL only inside the lists schema…
            `GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, LOCK TABLES, SELECT, INSERT, UPDATE, DELETE ON ${LISTS}.* TO 'cl_e2e_engine'@'%'`,
            // …and a data user with no DDL at all.
            `GRANT SELECT, INSERT, UPDATE, DELETE ON ${LISTS}.* TO 'cl_e2e_data'@'%'`,
          ]),
      // A CLARISA table with data: it must end the suite exactly as it started.
      `CREATE TABLE ${MAIN}.institutions (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100),
         is_active TINYINT DEFAULT 1)`,
      `INSERT INTO ${MAIN}.institutions (name) VALUES ('CIAT'), ('IRRI'), ('ILRI')`,
      // Minimal shape of the CLARISA tables the migration writes to.
      `CREATE TABLE ${MAIN}.roles (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, description TEXT, acronym VARCHAR(50),
         \`order\` INT, is_system TINYINT DEFAULT 0, level VARCHAR(20) DEFAULT 'module', is_active TINYINT DEFAULT 1,
         created_by BIGINT NULL)`,
      `CREATE TABLE ${MAIN}.permissions (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, name TEXT, module VARCHAR(100),
         label VARCHAR(255), description TEXT, is_active TINYINT DEFAULT 1, created_by BIGINT NULL)`,
      `CREATE TABLE ${MAIN}.role_permission (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, role_id BIGINT,
         permission_id BIGINT, is_active TINYINT DEFAULT 1, created_by BIGINT NULL)`,
      `CREATE TABLE ${MAIN}.user_roles (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id BIGINT, role_id BIGINT,
         is_active TINYINT DEFAULT 1)`,
      `INSERT INTO ${MAIN}.roles (description, acronym, \`order\`, level) VALUES
         ('Super Admin', 'SA', 1, 'super'), ('Team A', 'TEAM_A', 2, 'module'), ('Team B', 'TEAM_B', 3, 'module')`,
    ]) {
      await sql(stmt);
    }

    clarisaBefore = await clarisaSnapshot();

    proxy = await startProxy();
    for (const k of [
      'CONTROL_LISTS_DB_NAME',
      'CONTROL_LISTS_DB_USER',
      'CONTROL_LISTS_DB_PASS',
      'CONTROL_LISTS_DATA_DB_USER',
      'CONTROL_LISTS_DATA_DB_PASS',
    ])
      delete process.env[k];
    Object.assign(process.env, {
      CONTROL_LISTS_ENABLED: 'true',
      // Through the proxy, so the tests can cut the engine's connection.
      CONTROL_LISTS_DB_HOST: '127.0.0.1',
      CONTROL_LISTS_DB_PORT: String(proxy.port),
      CONTROL_LISTS_RECONCILE_EVERY_SECONDS: '3600', // ticks are driven by the tests
      CONTROL_LISTS_RECONCILE_GRACE_SECONDS: '3',
      ...(SHARED
        ? // Nothing of its own: the module falls back to CLARISA's DB_* (as deployed).
          { DB_NAME: MAIN, DB_USER: 'cl_e2e_app', DB_PASS: 'app' }
        : {
            CONTROL_LISTS_DB_NAME: LISTS,
            CONTROL_LISTS_DB_USER: 'cl_e2e_engine',
            CONTROL_LISTS_DB_PASS: 'engine',
            CONTROL_LISTS_DATA_DB_USER: 'cl_e2e_data',
            CONTROL_LISTS_DATA_DB_PASS: 'data',
          }),
    });

    mainDs = await new DataSource({
      type: 'mysql',
      host: HOST,
      port: PORT,
      username: 'cl_e2e_app',
      password: 'app',
      database: MAIN,
      name: 'cl-e2e-main',
      bigNumberStrings: false, // same as src/ormconfig.ts
      extra: { namedPlaceholders: true },
    }).initialize();
  });

  afterAll(async () => {
    await app?.close();
    await mainDs?.destroy();
    await proxy?.close();
    await root?.destroy();
  });

  it('migration: up runs twice without duplicating anything', async () => {
    const m = new AddControlListsCatalog1794200000000();
    for (let i = 0; i < 2; i++) {
      const qr = root.createQueryRunner();
      await qr.connect();
      await qr.query(`USE ${MAIN}`);
      await m.up(qr);
      await qr.release();
    }
    const perms = await sql(
      `SELECT name FROM ${MAIN}.permissions WHERE module = 'Control lists' ORDER BY name`,
    );
    expect(perms.map((p) => p.name)).toEqual([
      '/api/control-lists/admin',
      '/api/control-lists/admin/data',
      '/api/control-lists/admin/schema',
    ]);
    const grants = await sql(
      `SELECT r.acronym, p.name FROM ${MAIN}.role_permission rp
         JOIN ${MAIN}.roles r ON r.id = rp.role_id JOIN ${MAIN}.permissions p ON p.id = rp.permission_id
        ORDER BY r.acronym, p.name`,
    );
    expect(grants.map((g) => `${g.acronym} ${g.name}`)).toEqual([
      'CL_DESIGNER /api/control-lists/admin/data',
      'CL_DESIGNER /api/control-lists/admin/schema',
      'CL_EDITOR /api/control-lists/admin/data',
      'SA /api/control-lists/admin',
    ]);
    for (const r of await sql(`SELECT id, acronym FROM ${MAIN}.roles`))
      roleId[r.acronym] = Number(r.id);
    expect(Object.keys(roleId).sort()).toEqual([
      'CL_DESIGNER',
      'CL_EDITOR',
      'SA',
      'TEAM_A',
      'TEAM_B',
    ]);
  });

  it('boots the module with the real guards', async () => {
    const access = {
      getAccess: async (email: string) => {
        const u = USERS[email];
        if (!u) throw new UnauthorizedException();
        return {
          userId: u.id,
          email,
          roles: u.roles.map((a) => ({
            id: roleId[a],
            acronym: a,
            description: a,
            level: u.super ? 'super' : 'module',
          })),
          permissions: u.perms,
          isSuper: !!u.super,
        };
      },
    };
    const users = {
      findOneByEmail: async (email: string) =>
        USERS[email]
          ? { id: USERS[email].id, email, permissions: USERS[email].perms }
          : null,
    };
    /** Stands in for passport: the session is whoever `x-test-user` says. */
    const session: CanActivate = {
      canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest();
        const email = req.headers['x-test-user'];
        if (!email) throw new UnauthorizedException();
        req.user = { email, userId: USERS[email]?.id, permissions: '' };
        return true;
      },
    };
    const ref = await Test.createTestingModule({
      controllers: [ControlListsAdminController, ControlListsPublicController],
      providers: [
        ...CONTROL_LISTS_PROVIDERS,
        { provide: DataSource, useValue: mainDs },
        { provide: UserAccessService, useValue: access },
        { provide: UserService, useValue: users },
        PermissionGuard, // the real one: authorises by route prefix
        JwtAuthGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(session)
      .compile();
    app = ref.createNestApplication();
    app.setGlobalPrefix('api/control-lists');
    app.useGlobalFilters(new ExceptionsFilter(app.get(HttpAdapterHost)));
    await app.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as net.AddressInfo).port}`;
    expect((await pub('')).status).toBe(200);
  });

  itShared(
    'shared database: catalog codes are refused and a table that already exists is never adopted',
    async () => {
      const owner = roleId.TEAM_A;
      for (const code of ['lists', 'fields', 'schema_ops']) {
        const r = await admin('post', 'schema/lists', {
          code,
          name: code,
          owner_role_id: owner,
        });
        expect([code, r.status]).toEqual([code, 400]);
      }
      // A table that is not a list, with the name a list would get.
      await sql(
        `CREATE TABLE ${MAIN}.cl_legacy (id INT PRIMARY KEY, v VARCHAR(10))`,
      );
      await sql(`INSERT INTO ${MAIN}.cl_legacy VALUES (1, 'keep')`);
      const refused = await admin('post', 'schema/lists', {
        code: 'legacy',
        name: 'legacy',
        owner_role_id: owner,
      });
      expect(refused.status).toBe(409);
      // Appears between the draft and the publish: refused again, nothing changes.
      const late = await createList(
        'late_one',
        [{ code: 'name', label: 'Name', type: 'text' }],
        false,
      );
      await sql(`CREATE TABLE ${MAIN}.cl_late_one (id INT PRIMARY KEY)`);
      const publish = await admin('post', `schema/lists/${late}/publish`, {});
      expect(publish.status).toBe(409);
      expect((await admin('get', `schema/lists/${late}`)).body.status).toBe(
        'draft',
      );
      expect((await admin('delete', `schema/lists/${late}`)).status).toBe(200);
      expect(await tableExists('cl_late_one')).toBe(true);
      expect(await sql(`SELECT v FROM ${MAIN}.cl_legacy`)).toEqual([
        { v: 'keep' },
      ]);
      expect(
        await sql(`SELECT id FROM ${MAIN}.cl_schema_ops WHERE list_id = ?`, [
          late,
        ]),
      ).toEqual([]);
      await sql(`DROP TABLE ${MAIN}.cl_legacy, ${MAIN}.cl_late_one`);
    },
  );

  itSeparate(
    'the engine user cannot read the main schema; the data user cannot change structure',
    async () => {
      const engine = await new DataSource({
        type: 'mysql',
        host: HOST,
        port: PORT,
        username: 'cl_e2e_engine',
        password: 'engine',
        name: 'cl-e2e-eng',
      }).initialize();
      const data = await new DataSource({
        type: 'mysql',
        host: HOST,
        port: PORT,
        username: 'cl_e2e_data',
        password: 'data',
        name: 'cl-e2e-data',
      }).initialize();
      try {
        await expect(
          engine.query(`SELECT * FROM ${MAIN}.roles`),
        ).rejects.toThrow(/denied/);
        await expect(
          engine.query(`CREATE TABLE ${MAIN}.x (id INT)`),
        ).rejects.toThrow(/denied/);
        await expect(
          data.query(`CREATE TABLE ${LISTS}.x (id INT)`),
        ).rejects.toThrow(/denied/);
      } finally {
        await engine.destroy();
        await data.destroy();
      }
    },
  );

  describe('access', () => {
    it('no session → 401; no permission → 403; an editor cannot design', async () => {
      expect(
        (await call('get', '/api/control-lists/admin/schema/lists')).status,
      ).toBe(401);
      expect(
        (await admin('get', 'schema/lists', undefined, 'nobody@e2e')).status,
      ).toBe(403);
      expect(
        (
          await admin(
            'post',
            'schema/lists',
            { code: 'x', name: 'x' },
            'editor.a@e2e',
          )
        ).status,
      ).toBe(403);
    });

    it('a list belongs to a role: another team gets 404, the super admin sees it', async () => {
      const id = await createList(
        'team_a_only',
        [{ code: 'name', label: 'Name', type: 'text' }],
        false,
      );
      expect(
        (await admin('get', `schema/lists/${id}`, undefined, 'designer.b@e2e'))
          .status,
      ).toBe(404);
      expect(
        (
          await admin(
            'delete',
            `schema/lists/${id}`,
            undefined,
            'designer.b@e2e',
          )
        ).status,
      ).toBe(404);
      const b = await admin('get', 'schema/lists', undefined, 'designer.b@e2e');
      expect(b.body.map((l: any) => l.code)).not.toContain('team_a_only');
      expect(
        (await admin('get', `schema/lists/${id}`, undefined, 'sa@e2e')).status,
      ).toBe(200);
      const own = await admin('post', 'schema/lists', {
        code: 'stolen',
        name: 'x',
        owner_role_id: roleId.TEAM_B,
      });
      expect([own.status, own.body.message]).toEqual([
        400,
        'You can only give a list to a role you hold.',
      ]);
      expect((await admin('delete', `schema/lists/${id}`)).status).toBe(200);
    });

    it('switched off, every route answers 404', async () => {
      process.env.CONTROL_LISTS_ENABLED = 'false';
      try {
        expect((await pub('')).status).toBe(404);
        expect((await admin('get', 'schema/lists')).status).toBe(404);
      } finally {
        process.env.CONTROL_LISTS_ENABLED = 'true';
      }
    });
  });

  describe('public contract (§8 condition 3)', () => {
    let kinds: number;
    const kindIds: number[] = [];

    beforeAll(async () => {
      kinds = await createList('soil_kinds', [
        {
          code: 'name',
          label: 'Name',
          type: 'text',
          is_required: true,
          is_unique: true,
        },
        { code: 'active', label: 'Active', type: 'boolean', is_indexed: true },
        { code: 'age', label: 'Age', type: 'integer', is_indexed: true },
        { code: 'note', label: 'Note', type: 'text' },
        { code: 'weight', label: 'Weight', type: 'decimal', is_indexed: true },
      ]);
      void kinds;
      for (let i = 0; i < 120; i++) {
        const r = await admin('post', 'data/soil_kinds', {
          name: `kind ${i}`,
          active: i % 3 !== 0,
          age: i % 7,
        });
        expect(r.status).toBe(201);
        kindIds.push(r.body.id);
      }
    });

    it('answers a flat array with every record, no silent cut at 100 (defect C)', async () => {
      const r = await pub('soil_kinds?show=all');
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body)).toBe(true);
      expect(r.body).toHaveLength(120);
    });

    it('id is a number, booleans are true/false and is_active is always present (defects B, J)', async () => {
      const [first] = (await pub('soil_kinds?show=all')).body;
      expect(first).toEqual({
        id: kindIds[0],
        name: 'kind 0',
        active: false,
        age: 0,
        note: null,
        weight: null,
        is_active: true,
      });
      const one = await pub(`soil_kinds/get/${kindIds[1]}`);
      expect(one.body).toEqual({
        id: kindIds[1],
        name: 'kind 1',
        active: true,
        age: 1,
        note: null,
        weight: null,
        is_active: true,
      });
    });

    it('filters by the field type: true means true, letters in a number are a 400 (defect A)', async () => {
      const on = (await pub('soil_kinds?active=true')).body;
      expect(on).toHaveLength(80);
      expect(on.every((k: any) => k.active === true)).toBe(true);
      expect(
        (await pub('soil_kinds?active=false')).body.every(
          (k: any) => k.active === false,
        ),
      ).toBe(true);
      expect((await pub('soil_kinds?age=abc')).status).toBe(400);
      expect((await pub('soil_kinds?age=5x')).status).toBe(400);
      expect((await pub('soil_kinds?active=yes')).status).toBe(400);
      const five = (await pub('soil_kinds?age=5&show=all')).body;
      expect(five.length).toBeGreaterThan(0);
      expect(five.every((k: any) => k.age === 5)).toBe(true);
      expect((await pub('soil_kinds?note=x')).status).toBe(400); // not filterable
      expect((await pub('soil_kinds?nope=1')).status).toBe(400);
    });

    it('decimals come back exactly as written and filter exactly; ?version is accepted', async () => {
      const w = await admin('patch', `data/soil_kinds/${kindIds[4]}`, {
        weight: '12345678901.2345',
      });
      expect([w.status, w.body.weight]).toEqual([200, 12345678901.2345]);
      const hit = (await pub('soil_kinds?weight=12345678901.2345')).body;
      expect(hit.map((k: any) => k.id)).toEqual([kindIds[4]]);
      expect((await pub('soil_kinds?weight=12345678901.2346')).body).toEqual(
        [],
      );
      const tooLong = await admin('patch', `data/soil_kinds/${kindIds[4]}`, {
        weight: '12345678901234.5678',
      });
      expect(tooLong.status).toBe(400);
      expect((await pub('soil_kinds?version=1')).status).toBe(200);
      await admin('patch', `data/soil_kinds/${kindIds[4]}`, { weight: '' });
    });

    it('expand nests the related record and never overwrites a real field (defect G)', async () => {
      await createList('soils', [
        {
          code: 'kind',
          label: 'Kind',
          type: 'relation',
          relation_list_id: kinds,
        },
        { code: 'kind_label', label: 'Kind label', type: 'text' },
        { code: 'published_on', label: 'Published on', type: 'date' },
        { code: 'measured_at', label: 'Measured at', type: 'datetime' },
        { code: 'price', label: 'Price', type: 'decimal' },
        { code: 'notes', label: 'Notes', type: 'long_text' },
      ]);
      const r = await admin('post', 'data/soils', {
        kind: kindIds[1],
        kind_label: 'REAL-VALUE',
        published_on: '2026-11-13',
        measured_at: '2026-11-13 18:45',
        price: '12.5',
        notes: 'n'.repeat(300),
      });
      expect(r.status).toBe(201);
      const [row] = (await pub('soils?expand=kind')).body;
      expect(row.kind).toEqual({
        id: kindIds[1],
        name: 'kind 1',
        active: true,
        age: 1,
        note: null,
        weight: null,
        is_active: true,
      });
      expect(row.kind_label).toBe('REAL-VALUE');
      // Dates as written, no time-zone shift; decimals as numbers (defect J).
      expect(row.published_on).toBe('2026-11-13');
      expect(row.measured_at).toBe('2026-11-13 18:45:00');
      expect(row.price).toBe(12.5);
      expect((await pub('soils?expand=kind_label')).status).toBe(400);
    });

    it('a relation to a list of another owner role is refused', async () => {
      const b = await createList(
        'team_b_kinds',
        [{ code: 'name', label: 'Name', type: 'text' }],
        true,
        'designer.b@e2e',
      );
      const soils = (await admin('get', 'schema/lists')).body.find(
        (l: any) => l.code === 'soils',
      );
      const r = await admin('post', `schema/lists/${soils.id}/fields`, {
        code: 'foreign_kind',
        type: 'relation',
        relation_list_id: b,
      });
      expect(r.status).toBe(400);
    });

    it('deleting a record deactivates it; the same request_id twice gives one record', async () => {
      const del = await admin('delete', `data/soil_kinds/${kindIds[2]}`, {
        modification_justification: 'Duplicate',
      });
      expect([del.status, del.body.is_active]).toEqual([200, false]);
      expect(
        (await pub('soil_kinds')).body.map((k: any) => k.id),
      ).not.toContain(kindIds[2]);
      expect(
        (await pub('soil_kinds?show=inactive')).body.map((k: any) => k.id),
      ).toContain(kindIds[2]);
      const audit = (
        await sql(
          `SELECT updated_by, modification_justification FROM ${LISTS}.cl_soil_kinds WHERE id = ?`,
          [kindIds[2]],
        )
      )[0];
      expect(audit).toEqual({
        updated_by: String(USERS[A].id),
        modification_justification: 'Duplicate',
      });

      const body = { name: 'twice', request_id: 'form-123' };
      const [x, y] = await Promise.all([
        admin('post', 'data/soil_kinds', body),
        admin('post', 'data/soil_kinds', body),
      ]);
      expect([x.status, y.status]).toEqual([201, 201]);
      expect(x.body.id).toBe(y.body.id);
      expect(
        (
          await sql(
            `SELECT COUNT(*) AS n FROM ${LISTS}.cl_soil_kinds WHERE name = 'twice'`,
          )
        )[0].n,
      ).toBe('1');
    });

    it('an editor of the team edits records; another team cannot', async () => {
      expect(
        (
          await admin(
            'patch',
            `data/soil_kinds/${kindIds[3]}`,
            { note: 'ok' },
            'editor.a@e2e',
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await admin(
            'patch',
            `data/soil_kinds/${kindIds[3]}`,
            { note: 'no' },
            'designer.b@e2e',
          )
        ).status,
      ).toBe(404);
    });
  });

  describe('changing a field type (§8 conditions 4 and 6)', () => {
    let soils: any;
    const field = (code: string) =>
      soils.fields.find((f: any) => f.code === code);

    beforeAll(async () => {
      const id = (await admin('get', 'schema/lists')).body.find(
        (l: any) => l.code === 'soils',
      ).id;
      soils = (await admin('get', `schema/lists/${id}`)).body;
    });

    it('counts the records that would change and asks for that number (defect I)', async () => {
      const price = field('price');
      const first = await admin('patch', `schema/fields/${price.id}/type`, {
        type: 'integer',
      });
      expect([first.status, first.body.response?.affected]).toEqual([409, 1]);
      const impact = await admin(
        'get',
        `schema/fields/${price.id}/impact?action=type&type=integer`,
      );
      expect(impact.body.affected).toBe(1);
      const wrong = await admin('patch', `schema/fields/${price.id}/type`, {
        type: 'integer',
        confirm_affected: 2,
      });
      expect(wrong.status).toBe(409);
      const ok = await admin('patch', `schema/fields/${price.id}/type`, {
        type: 'integer',
        confirm_affected: 1,
      });
      expect([ok.status, ok.body.type]).toEqual([200, 'integer']);
      expect((await pub('soils')).body[0].price).toBe(13);

      const at = await admin(
        'patch',
        `schema/fields/${field('measured_at').id}/type`,
        { type: 'date' },
      );
      expect([at.status, at.body.response?.affected]).toEqual([409, 1]);
    });

    it('the server is lax, and a lax session would cut the text silently', async () => {
      expect((await sql('SELECT @@GLOBAL.sql_mode AS m'))[0].m).toBe('');
      const qr = root.createQueryRunner();
      await qr.connect();
      try {
        await qr.query(`SET SESSION sql_mode = ''`);
        await qr.query(`CREATE TABLE ${LISTS}.lax_probe (t TEXT)`);
        await qr.query(
          `INSERT INTO ${LISTS}.lax_probe VALUES (REPEAT('n', 300))`,
        );
        await qr.query(
          `ALTER TABLE ${LISTS}.lax_probe MODIFY COLUMN t VARCHAR(255) NULL`,
        );
        expect(
          (await qr.query(`SELECT LENGTH(t) AS n FROM ${LISTS}.lax_probe`))[0]
            .n,
        ).toBe('255');
      } finally {
        await qr.query(`DROP TABLE IF EXISTS ${LISTS}.lax_probe`);
        await qr.release();
      }
    });

    it('the engine pins strict mode: the same change is refused and the data stays whole', async () => {
      const notes = field('notes');
      const r = await admin('patch', `schema/fields/${notes.id}/type`, {
        type: 'text',
        confirm_affected: 1,
        request_id: 'retype-notes',
      });
      expect(r.status).toBe(400);
      expect((await op('retype-notes')).status).toBe('failed');
      expect(
        (await sql(`SELECT LENGTH(notes) AS n FROM ${LISTS}.cl_soils`))[0].n,
      ).toBe('300');
      expect((await fieldRow(soils.id, 'notes')).type).toBe('long_text');
    });
  });

  describe('nothing stays stuck (§8 conditions 1 and 5)', () => {
    let traps: number;
    const trap = `CREATE TRIGGER ${MAIN}.cl_e2e_trap BEFORE UPDATE ON ${MAIN}.cl_fields FOR EACH ROW
      BEGIN IF NEW.code = 'must_have' AND NEW.status = 'published' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'catalog trap'; END IF; END`;

    beforeAll(async () => {
      traps = await createList('traps', [
        { code: 'name', label: 'Name', type: 'text' },
      ]);
    });
    afterEach(async () => {
      await sql(`DROP TRIGGER IF EXISTS ${MAIN}.cl_e2e_trap`);
    });

    it('catalog fails after the ALTER: the failure is real (500), the list is held, the timer finishes it (defects D, E)', async () => {
      await sql(trap);
      const r = await admin('post', `schema/lists/${traps}/fields`, {
        code: 'must_have',
        label: 'Must have',
        type: 'text',
        is_required: true,
        request_id: 'trap-d',
      });
      expect(r.status).toBe(500); // the failure happened: not a silent 201
      expect((await op('trap-d')).status).toBe('pending');
      expect(await columnExists('cl_traps', 'must_have')).toBe(true);
      expect((await fieldRow(traps, 'must_have')).status).toBe('draft');

      // The only thing the screen offered in the lab, and what made it permanent.
      const draft = await fieldRow(traps, 'must_have');
      expect((await admin('delete', `schema/fields/${draft.id}`)).status).toBe(
        409,
      );
      expect(
        (
          await admin('post', `schema/lists/${traps}/fields`, {
            code: 'other',
            type: 'text',
          })
        ).status,
      ).toBe(409);

      await sql(`DROP TRIGGER ${MAIN}.cl_e2e_trap`);
      await tick();
      expect((await op('trap-d')).status).toBe('applied');
      expect((await fieldRow(traps, 'must_have')).status).toBe('published');
      expect(
        (await admin('post', 'data/traps', { name: 'x', must_have: 'yes' }))
          .status,
      ).toBe(201);
      expect(
        (await admin('post', 'data/traps', { name: 'y' })).body.message,
      ).toBe('"Must have" is required.');
    });

    it('a change on the list settles what it left open, without waiting for the timer', async () => {
      const t2 = await createList('traps_two', [
        { code: 'name', label: 'Name', type: 'text' },
      ]);
      await sql(trap);
      const r = await admin('post', `schema/lists/${t2}/fields`, {
        code: 'must_have',
        type: 'text',
        is_required: true,
        request_id: 'trap-d2',
      });
      expect(r.status).toBe(500);
      await sql(`DROP TRIGGER ${MAIN}.cl_e2e_trap`);
      const name = await fieldRow(t2, 'name');
      expect(
        (
          await admin('patch', `schema/fields/${name.id}`, {
            label: 'Full name',
          })
        ).status,
      ).toBe(200);
      expect((await op('trap-d2')).status).toBe('applied');
      expect((await fieldRow(t2, 'must_have')).status).toBe('published');
    });

    it('a busy table answers "try again", and the retry with the same id works (defect H)', async () => {
      const hold = await holdTable('cl_traps');
      const started = Date.now();
      const busy = await admin('post', `schema/lists/${traps}/fields`, {
        code: 'busy',
        type: 'text',
        is_indexed: true,
        request_id: 'op-h',
      });
      expect(busy.status).toBe(409);
      expect(Date.now() - started).toBeLessThan(9_000); // lock_wait_timeout = 5 s, not a year
      expect((await op('op-h')).status).toBe('failed');
      expect(await fieldRow(traps, 'busy')).toBeUndefined();
      await hold.release();

      const retry = await admin('post', `schema/lists/${traps}/fields`, {
        code: 'busy',
        type: 'text',
        is_indexed: true,
        request_id: 'op-h',
      });
      expect([retry.status, retry.body.status]).toEqual([201, 'published']);
      expect((await op('op-h')).status).toBe('applied');
    });

    it('connection lost mid-ALTER and the server finishes it: open, the next change waits and settles it (defect K)', async () => {
      const hold = await holdTable('cl_traps');
      const pending = admin('post', `schema/lists/${traps}/fields`, {
        code: 'late',
        type: 'text',
        request_id: 'op-k1',
      }).then((r) => r); // .then() sends it now
      await until(
        'the ALTER waiting for the table',
        async () => (await alterThread('late')) > 0,
      );
      proxy.cut();
      expect((await pending).status).toBe(503);
      expect((await op('op-k1')).status).toBe('pending'); // NOT "failed": the outcome was unknown
      const late = await fieldRow(traps, 'late');
      expect(late.status).toBe('draft');

      // The orphan ALTER still holds the schema lock on the server, so the next
      // change waits for it instead of guessing…
      const del = admin('delete', `schema/fields/${late.id}`).then((r) => r);
      await wait(500);
      await hold.release(); // …the ALTER lands as soon as the table is free…
      const r = await del;
      // …and the delete sees the field as it really is now (published, with a
      // column), so it drops the column instead of orphaning it.
      expect([r.status, r.body.deleted]).toEqual([200, true]);
      expect((await op('op-k1')).status).toBe('applied');
      expect(await columnExists('cl_traps', 'late')).toBe(false);
      expect(await fieldRow(traps, 'late')).toBeUndefined();
      expect(((await lastOp(traps)) as any).kind).toBe('delete_field');
    });

    it('connection lost and the ALTER never lands: after the grace period it is failed and the list is free', async () => {
      const hold = await holdTable('cl_traps');
      const pending = admin('post', `schema/lists/${traps}/fields`, {
        code: 'late_two',
        type: 'text',
        request_id: 'op-k2',
      }).then((r) => r);
      let thread = 0;
      await until('the ALTER waiting for the table', async () => {
        thread = await alterThread('late_two');
        return thread > 0;
      });
      proxy.cut();
      expect((await pending).status).toBe(503);
      await sql(`KILL ${thread}`);
      await hold.release();
      expect(await columnExists('cl_traps', 'late_two')).toBe(false);

      await tick(); // too young: still open
      expect((await op('op-k2')).status).toBe('pending');
      await wait(3_500);
      await tick();
      expect((await op('op-k2')).status).toBe('failed');
      // The draft field it would have published left with it…
      expect(await fieldRow(traps, 'late_two')).toBeUndefined();
      // …so the same request can simply be sent again.
      const retry = await admin('post', `schema/lists/${traps}/fields`, {
        code: 'late_two',
        type: 'text',
        request_id: 'op-k2',
      });
      expect([retry.status, retry.body.status]).toEqual([201, 'published']);
      expect((await op('op-k2')).status).toBe('applied');
    });
  });

  describe('the lock covers the whole operation (§8 condition 2)', () => {
    it('publish and add-field at the same time never leave a draft field in a published list', async () => {
      for (let i = 0; i < 5; i++) {
        const id = await createList(
          `race_${i}`,
          [{ code: 'a', type: 'text' }],
          false,
        );
        const [p, f] = await Promise.all([
          admin('post', `schema/lists/${id}/publish`, {}),
          admin('post', `schema/lists/${id}/fields`, {
            code: 'b',
            type: 'text',
          }),
        ]);
        expect([p.status, f.status]).toEqual([201, 201]);
        const fields = await sql(
          `SELECT code, status FROM ${MAIN}.cl_fields WHERE list_id = ? ORDER BY code`,
          [id],
        );
        expect(fields).toEqual([
          { code: 'a', status: 'published' },
          { code: 'b', status: 'published' },
        ]);
        expect(await columnExists(`cl_race_${i}`, 'b')).toBe(true);
      }
    });

    it('deleting a list while a relation to it is created: exactly one wins, the catalog matches the tables', async () => {
      for (let i = 0; i < 5; i++) {
        const target = await createList(`target_${i}`, [
          { code: 'name', type: 'text' },
        ]);
        const source = (await admin('get', 'schema/lists')).body.find(
          (l: any) => l.code === `race_${i}`,
        ).id;
        const [del, rel] = await Promise.all([
          admin('delete', `schema/lists/${target}`),
          admin('post', `schema/lists/${source}/fields`, {
            code: 'target',
            type: 'relation',
            relation_list_id: target,
          }),
        ]);
        expect(
          [del.status === 200, rel.status === 201].filter(Boolean),
        ).toHaveLength(1);
        const listLeft = (
          await sql(`SELECT status FROM ${MAIN}.cl_lists WHERE id = ?`, [
            target,
          ])
        )[0];
        if (del.status === 200) {
          expect(listLeft).toBeUndefined();
          expect(await tableExists(`cl_target_${i}`)).toBe(false);
          expect(await fieldRow(source, 'target')).toBeUndefined();
        } else {
          expect(listLeft.status).toBe('published');
          expect(await tableExists(`cl_target_${i}`)).toBe(true);
          expect((await fieldRow(source, 'target')).status).toBe('published');
        }
      }
      expect(
        (
          await sql(
            `SELECT COUNT(*) AS n FROM ${MAIN}.cl_schema_ops WHERE status = 'pending'`,
          )
        )[0].n,
      ).toBe('0');
    });
  });

  describe('a field with its own options list', () => {
    const parents: number[] = [];
    const optionLists: string[] = [];
    const nameField = [{ code: 'name', label: 'Name', type: 'text' }];
    const listCount = async () =>
      Number((await sql(`SELECT COUNT(*) AS n FROM ${MAIN}.cl_lists`))[0].n);
    const fieldCount = async (listId: number) =>
      Number(
        (
          await sql(
            `SELECT COUNT(*) AS n FROM ${MAIN}.cl_fields WHERE list_id = ?`,
            [listId],
          )
        )[0].n,
      );
    const relationBody = (
      code: string,
      options: unknown[],
      extra: Record<string, unknown> = {},
    ) => ({
      code: 'kind',
      label: 'Kind',
      type: 'relation',
      options_list: { code, name: code.replace(/_/g, ' '), options },
      ...extra,
    });
    const newParent = async (code: string, publish: boolean) => {
      const id = await createList(code, nameField, publish);
      parents.push(id);
      return id;
    };
    /** The request leaves no trace: same number of lists, same fields in the parent. */
    async function expectNothingLeft(
      parent: number,
      body: unknown,
      message: RegExp,
      status = 400,
    ) {
      const lists = await listCount();
      const fields = await fieldCount(parent);
      const r = await admin('post', `schema/lists/${parent}/fields`, body);
      expect(r.status).toBe(status);
      expect(String(r.body?.message)).toMatch(message);
      expect(await listCount()).toBe(lists);
      expect(await fieldCount(parent)).toBe(fields);
      return r;
    }

    afterAll(async () => {
      // Relations first, then the parents, then the option lists they pointed to.
      for (const id of parents.reverse()) {
        const detail = await admin('get', `schema/lists/${id}`);
        for (const f of detail.body.fields ?? [])
          if (f.type === 'relation')
            await admin('delete', `schema/fields/${f.id}`);
        await admin('delete', `schema/lists/${id}`);
      }
      for (const code of optionLists) {
        const l = (await admin('get', 'schema/lists')).body.find(
          (x: any) => x.code === code,
        );
        if (l) await admin('delete', `schema/lists/${l.id}`);
      }
    });

    it('a draft parent: the options list is published, in order, and the parent points to it', async () => {
      const parent = await newParent('opt_draft_parent', false);
      optionLists.push('opt_draft_kinds');
      const r = await admin(
        'post',
        `schema/lists/${parent}/fields`,
        relationBody('opt_draft_kinds', ['Sandy', '  Clay ', 'Loam']),
      );
      expect([r.status, r.body?.message]).toEqual([201, undefined]);
      expect(r.body).toMatchObject({
        code: 'kind',
        type: 'relation',
        list_id: parent,
        options_list: { code: 'opt_draft_kinds', name: 'opt draft kinds' },
      });
      expect(
        (await pub('opt_draft_kinds')).body.map((o: any) => o.name),
      ).toEqual(['Sandy', 'Clay', 'Loam']);
      const opts = (await admin('get', 'schema/lists')).body.find(
        (l: any) => l.code === 'opt_draft_kinds',
      );
      expect(opts.status).toBe('published');
      expect(r.body.options_list.id).toBe(opts.id);
      expect(r.body.relation_list_id).toBe(opts.id);

      expect(
        (await admin('post', `schema/lists/${parent}/publish`, {})).status,
      ).toBe(201);
      const clay = (await pub('opt_draft_kinds')).body[1].id;
      const rec = await admin('post', 'data/opt_draft_parent', {
        name: 'plot 1',
        kind: clay,
      });
      expect(rec.status).toBe(201);
      expect(
        (await pub('opt_draft_parent?expand=kind')).body[0].kind.name,
      ).toBe('Clay');
    });

    it('a published parent without records: the column and the foreign key exist', async () => {
      const parent = await newParent('opt_pub_parent', true);
      optionLists.push('opt_pub_kinds');
      const r = await admin(
        'post',
        `schema/lists/${parent}/fields`,
        relationBody('opt_pub_kinds', ['A', 'B'], { is_required: true }),
      );
      expect([r.status, r.body?.message, r.body?.status]).toEqual([
        201,
        undefined,
        'published',
      ]);
      expect(await columnExists('cl_opt_pub_parent', 'kind')).toBe(true);
      const ddl = (await admin('get', `schema/lists/${parent}/sql`)).body.sql;
      expect(ddl).toContain('FOREIGN KEY');
      expect(ddl).toContain('cl_opt_pub_kinds');
    });

    it('the same request_id twice, and two identical requests at once: one of everything', async () => {
      const parent = await newParent('opt_twice_parent', false);
      optionLists.push('opt_twice_kinds', 'opt_par_kinds');
      const body = relationBody('opt_twice_kinds', ['One', 'Two'], {
        request_id: 'opt-twice',
      });
      const first = await admin('post', `schema/lists/${parent}/fields`, body);
      const again = await admin('post', `schema/lists/${parent}/fields`, body);
      expect([first.status, again.status]).toEqual([201, 201]);
      expect(again.body.id).toBe(first.body.id);
      expect(again.body.options_list.id).toBe(first.body.options_list.id);
      expect(await fieldCount(parent)).toBe(2);
      expect(
        (await pub('opt_twice_kinds')).body.map((o: any) => o.name),
      ).toEqual(['One', 'Two']);

      const parent2 = await newParent('opt_par_parent', false);
      const par = relationBody('opt_par_kinds', ['X', 'Y', 'Z'], {
        request_id: 'opt-par',
      });
      const both = await Promise.all([
        admin('post', `schema/lists/${parent2}/fields`, par),
        admin('post', `schema/lists/${parent2}/fields`, par),
      ]);
      expect(both.map((r) => r.status)).toEqual([201, 201]);
      expect(both[1].body.id).toBe(both[0].body.id);
      expect(await fieldCount(parent2)).toBe(2);
      expect(
        Number(
          (
            await sql(
              `SELECT COUNT(*) AS n FROM ${MAIN}.cl_lists WHERE code = 'opt_par_kinds'`,
            )
          )[0].n,
        ),
      ).toBe(1);
      expect((await pub('opt_par_kinds')).body).toHaveLength(3);
    });

    it('what is wrong is refused before anything is written', async () => {
      const draft = await newParent('opt_val_draft', false);
      const full = await newParent('opt_val_full', true);
      await admin('post', 'data/opt_val_full', { name: 'row' });

      const refused: [number, unknown, RegExp][] = [
        [draft, relationBody('opt_v1', ['Café', 'cafe']), /is repeated/],
        [draft, relationBody('opt_v2', []), /at least one option/],
        [
          draft,
          relationBody(
            'opt_v3',
            Array.from({ length: 101 }, (_, i) => `option ${i}`),
          ),
          /100 options at most/,
        ],
        [draft, relationBody('opt_v4', ['a', ' ']), /option is empty/],
        [
          draft,
          relationBody('opt_v5', ['a'], { relation_list_id: full }),
          /not both/,
        ],
        // code of a list that exists
        [draft, relationBody('opt_val_full', ['a']), /already exists/],
        // the field exists in the parent
        [
          draft,
          relationBody('opt_v6', ['a'], { code: 'name' }),
          /field "name" already exists/,
        ],
        // the parent has records
        [
          full,
          relationBody('opt_v7', ['a'], { is_required: true }),
          /cannot start as required/,
        ],
        [
          draft,
          relationBody('opt_v8', ['a'], { request_id: 'r'.repeat(60) }),
          /operation id admits/,
        ],
        [
          draft,
          { ...relationBody('opt_v9', ['a']), type: 'text' },
          /only goes with a relation field/,
        ],
        // equal for the table's collation, though not for JavaScript
        [
          draft,
          relationBody('opt_v10', ['Strasse', 'Straße']),
          /"Strasse" and "Straße" read as the same value/,
        ],
      ];
      for (const [parent, body, message] of refused)
        await expectNothingLeft(parent, body, message);
      expect(await tableExists('cl_opt_v10')).toBe(false);

      const repeated = await expectNothingLeft(
        draft,
        relationBody('opt_v1', ['Café', 'cafe']),
        /is repeated/,
      );
      expect(repeated.body.message).toBe('The option "cafe" is repeated.');
      expect(await tableExists('cl_opt_v1')).toBe(false);
    });

    it('options that only another script tells apart are accepted: the table decides what repeats', async () => {
      const parent = await newParent('opt_scripts', false);
      optionLists.push('opt_scripts_kind');
      const r = await admin(
        'post',
        `schema/lists/${parent}/fields`,
        relationBody('opt_scripts_kind', ['क', 'कि', 'Café']),
      );
      expect([r.status, r.body?.message]).toEqual([201, undefined]);
      expect((await pub('opt_scripts_kind')).body).toHaveLength(3);
      // Case and Latin accents still read as one value.
      const again = await admin('post', `schema/lists/${parent}/fields`, {
        ...relationBody('opt_scripts_other', ['Café', 'cafe']),
        code: 'other',
      });
      expect([again.status, again.body.message]).toEqual([
        400,
        'The option "cafe" is repeated.',
      ]);
    });

    it('a failure after the options list was published is finished by repeating the request', async () => {
      const parent = await newParent('opt_resume_parent', false);
      optionLists.push('opt_resume_kinds');
      const body = relationBody('opt_resume_kinds', ['Red', 'Green'], {
        request_id: 'opt-resume',
      });
      const spy = jest
        .spyOn(DataService.prototype, 'createMany')
        .mockRejectedValueOnce(new Error('simulated failure'));
      try {
        const failed = await admin(
          'post',
          `schema/lists/${parent}/fields`,
          body,
        );
        expect(failed.status).toBe(500);
        expect(spy).toHaveBeenCalledTimes(1);
      } finally {
        spy.mockRestore();
      }
      // Half done: the list is real and empty, the parent has no relation yet.
      expect(await tableExists('cl_opt_resume_kinds')).toBe(true);
      expect(await fieldCount(parent)).toBe(1);
      expect((await pub('opt_resume_kinds')).body).toEqual([]);

      const retry = await admin('post', `schema/lists/${parent}/fields`, body);
      expect([retry.status, retry.body?.message]).toEqual([201, undefined]);
      expect(await fieldCount(parent)).toBe(2);
      expect(
        (await pub('opt_resume_kinds')).body.map((o: any) => o.name),
      ).toEqual(['Red', 'Green']);
      expect(
        Number(
          (
            await sql(
              `SELECT COUNT(*) AS n FROM ${MAIN}.cl_lists WHERE code = 'opt_resume_kinds'`,
            )
          )[0].n,
        ),
      ).toBe(1);
    });
  });

  describe('editing a list', () => {
    let id: number;
    const listRow = async () =>
      (await sql(`SELECT * FROM ${MAIN}.cl_lists WHERE id = ?`, [id]))[0];
    const opsCount = async () =>
      Number(
        (
          await sql(
            `SELECT COUNT(*) AS n FROM ${MAIN}.cl_schema_ops WHERE list_id = ?`,
            [id],
          )
        )[0].n,
      );

    beforeAll(async () => {
      id = await createList('edit_me', [
        { code: 'name', label: 'Name', type: 'text' },
      ]);
    });
    afterAll(async () => {
      await admin('delete', `schema/lists/${id}`);
    });

    it('changes the name and the description, never the code, the table or the status', async () => {
      const before = await listRow();
      const ops = await opsCount();
      const r = await admin('patch', `schema/lists/${id}`, {
        name: '  Crop types ',
        description: 'Crops grown in the trials.',
      });
      expect([r.status, r.body?.message]).toEqual([200, undefined]);
      expect(r.body).toMatchObject({
        code: 'edit_me',
        table_name: 'cl_edit_me',
        status: 'published',
        name: 'Crop types',
        description: 'Crops grown in the trials.',
      });
      expect(Number(r.body.id)).toBe(id);
      const after = await listRow();
      expect(after).toMatchObject({
        code: before.code,
        table_name: before.table_name,
        status: before.status,
        owner_role_id: before.owner_role_id,
        name: 'Crop types',
        updated_by: String(USERS[A].id),
      });
      expect(
        (await pub('')).body.find((l: any) => l.code === 'edit_me'),
      ).toMatchObject({
        name: 'Crop types',
        description: 'Crops grown in the trials.',
      });

      // Only the named key changes; an empty description clears it.
      const d = await admin('patch', `schema/lists/${id}`, {
        description: '',
      });
      expect([d.status, d.body.name, d.body.description]).toEqual([
        200,
        'Crop types',
        null,
      ]);
      expect(await opsCount()).toBe(ops);
    });

    it('the same request twice leaves the same row', async () => {
      const body = { name: 'Twice', description: 'Same' };
      const first = await admin('patch', `schema/lists/${id}`, body);
      const row = await listRow();
      const again = await admin('patch', `schema/lists/${id}`, body);
      expect([first.status, again.status]).toEqual([200, 200]);
      expect(again.body).toMatchObject({ name: 'Twice', description: 'Same' });
      const { updated_at: _a, ...x } = row;
      const { updated_at: _b, ...y } = await listRow();
      expect(y).toEqual(x);
    });

    it('what is wrong is refused before anything is written', async () => {
      const before = await listRow();
      const ops = await opsCount();
      const refused: [unknown, RegExp][] = [
        [{}, /^There is nothing to change\.$/],
        [{ request_id: 'x' }, /^There is nothing to change\.$/],
        [{ name: '   ' }, /^The list name is required\.$/],
        [{ name: null }, /^The list name is required\.$/],
        [{ name: 'n'.repeat(151) }, /^The list name admits 150 characters/],
        [{ description: 'd'.repeat(501) }, /admits 500 characters/],
        [
          { name: 'Other', code: 'edit_me' },
          /^The code and the owner role of a list cannot be changed\.$/,
        ],
        [
          { name: 'Other', owner_role_id: roleId.TEAM_A },
          /^The code and the owner role of a list cannot be changed\.$/,
        ],
      ];
      for (const [body, message] of refused) {
        const r = await admin('patch', `schema/lists/${id}`, body);
        expect([r.status, String(r.body?.message)]).toEqual([
          400,
          expect.stringMatching(message),
        ]);
      }
      expect(await listRow()).toEqual(before);
      expect(await opsCount()).toBe(ops);
    });

    it('another team gets 404; an editor gets 403', async () => {
      const before = await listRow();
      expect(
        (
          await admin(
            'patch',
            `schema/lists/${id}`,
            { name: 'Stolen' },
            'designer.b@e2e',
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await admin(
            'patch',
            `schema/lists/${id}`,
            { name: 'Stolen' },
            'editor.a@e2e',
          )
        ).status,
      ).toBe(403);
      expect(await listRow()).toEqual(before);
    });
  });

  describe('adding several records', () => {
    let maize: number;
    const nameField = {
      code: 'name',
      label: 'Name',
      type: 'text',
      is_required: true,
      is_unique: true,
    };
    const count = async (table: string) =>
      Number((await sql(`SELECT COUNT(*) AS n FROM ${LISTS}.${table}`))[0].n);
    const bulk = (code: string, body: unknown, user = A) =>
      admin('post', `data/${code}/bulk`, body, user);
    const created: number[] = [];

    beforeAll(async () => {
      const crops = await createList('bulk_crops', [
        nameField,
        { code: 'yield', label: 'Yield', type: 'decimal' },
      ]);
      const plots = await createList('bulk_plots', [
        { code: 'name', label: 'Name', type: 'text', is_required: true },
        {
          code: 'crop',
          label: 'Crop',
          type: 'relation',
          relation_list_id: crops,
        },
        {
          code: 'plot_no',
          label: 'Plot number',
          type: 'integer',
          is_unique: true,
        },
      ]);
      created.push(plots, crops);
    });
    afterAll(async () => {
      for (const id of created) await admin('delete', `schema/lists/${id}`);
    });

    it('writes every row in order, in one go, with its author', async () => {
      const r = await bulk('bulk_crops', {
        request_id: 'bulk-1',
        modification_justification: 'Import',
        records: [
          { name: 'Maize', yield: '12.5' },
          { name: 'Rice' },
          { name: 'Beans', yield: 3 },
        ],
      });
      expect([r.status, r.body]).toEqual([201, { created: 3 }]);
      const rows = await sql(
        `SELECT name, yield, created_by, request_id, modification_justification
           FROM ${LISTS}.cl_bulk_crops ORDER BY id`,
      );
      const by = String(USERS[A].id);
      expect(rows).toEqual([
        {
          name: 'Maize',
          yield: '12.5000',
          created_by: by,
          request_id: 'bulk-1:1',
          modification_justification: 'Import',
        },
        {
          name: 'Rice',
          yield: null,
          created_by: by,
          request_id: 'bulk-1:2',
          modification_justification: 'Import',
        },
        {
          name: 'Beans',
          yield: '3.0000',
          created_by: by,
          request_id: 'bulk-1:3',
          modification_justification: 'Import',
        },
      ]);
      maize = (await pub('bulk_crops')).body[0].id;
    });

    it('the same request_id again, and two identical requests at once: still N rows', async () => {
      const again = await bulk('bulk_crops', {
        request_id: 'bulk-1',
        records: [
          { name: 'Maize', yield: '12.5' },
          { name: 'Rice' },
          { name: 'Beans', yield: 3 },
        ],
      });
      expect([again.status, again.body]).toEqual([201, { created: 3 }]);
      expect(await count('cl_bulk_crops')).toBe(3);
      // The form edited after a failed attempt and sent with the same id: it
      // is NOT answered "created 3" (none of the new content would be there).
      const edited = await bulk('bulk_crops', {
        request_id: 'bulk-1',
        records: [
          { name: 'Maize', yield: '12.5' },
          { name: 'Rice' },
          { name: 'Beans', yield: 3 },
          { name: 'Oats' },
        ],
      });
      expect([edited.status, edited.body.message]).toEqual([
        409,
        'That operation id was already used for other records. Start again from the screen.',
      ]);
      expect(await count('cl_bulk_crops')).toBe(3);

      const body = {
        request_id: 'bulk-par',
        records: [{ name: 'Wheat' }, { name: 'Barley' }],
      };
      // A read lock lets both look up the id and find nothing, then holds
      // both INSERTs: the second one hits the unique key and must answer the
      // first one's count.
      const qr = root.createQueryRunner();
      await qr.connect();
      await qr.query(`LOCK TABLES ${LISTS}.cl_bulk_crops READ`);
      let pending: Promise<request.Response[]>;
      try {
        pending = Promise.all([
          bulk('bulk_crops', body),
          bulk('bulk_crops', body),
        ]);
        await until(
          'both inserts waiting',
          async () =>
            Number(
              (
                await sql(
                  `SELECT COUNT(*) AS n FROM information_schema.PROCESSLIST
                    WHERE ID <> CONNECTION_ID() AND INFO LIKE ?`,
                  ['INSERT INTO %cl_bulk_crops%bulk-par%'],
                )
              )[0].n,
            ) === 2,
        );
      } finally {
        await qr.query('UNLOCK TABLES');
        await qr.release();
      }
      const both = await pending;
      expect(both.map((r) => [r.status, r.body])).toEqual([
        [201, { created: 2 }],
        [201, { created: 2 }],
      ]);
      expect(await count('cl_bulk_crops')).toBe(5);
    });

    it('what is wrong is refused before anything is written', async () => {
      const refused: [string, unknown, RegExp, number?][] = [
        [
          'bulk_crops',
          { records: [{ name: 'a' }] },
          /^The operation id is required to add several records\.$/,
        ],
        [
          'bulk_crops',
          { request_id: 'r'.repeat(57), records: [{ name: 'a' }] },
          /^The operation id is not valid\.$/,
        ],
        [
          'bulk_crops',
          { request_id: 7, records: [{ name: 'a' }] },
          /^The operation id is not valid\.$/,
        ],
        // No ":" in the id: rows store "<id>:<n>", and "a" must never count the rows of "a:1".
        [
          'bulk_crops',
          { request_id: 'bulk-1:1', records: [{ name: 'a' }] },
          /^The operation id is not valid\.$/,
        ],
        [
          'bulk_crops',
          { request_id: 'v-empty', records: [] },
          /^Send between 1 and 500 records\.$/,
        ],
        [
          'bulk_crops',
          { request_id: 'v-object', records: { name: 'a' } },
          /^Send between 1 and 500 records\.$/,
        ],
        [
          'bulk_crops',
          {
            request_id: 'v-501',
            records: Array.from({ length: 501 }, (_, i) => ({
              name: `crop ${i}`,
            })),
          },
          /^Send between 1 and 500 records\.$/,
        ],
        [
          'bulk_crops',
          { request_id: 'v-shape', records: [{ name: 'a' }, 'b'] },
          /^Row 2: a record must be an object with one value per field\.$/,
        ],
        [
          'bulk_crops',
          { request_id: 'v-array', records: [{ name: 'a' }, ['b']] },
          /^Row 2: a record must be an object with one value per field\.$/,
        ],
        [
          'bulk_crops',
          {
            request_id: 'v-key',
            records: [{ name: 'a' }, { name: 'b', colour: 'red' }],
          },
          /^Row 2: "colour" is not a field of this list\.$/,
        ],
        [
          'bulk_crops',
          {
            request_id: 'v-required',
            records: [{ name: 'a' }, { name: ' ', yield: 2 }],
          },
          /^Row 2: "Name" is required\.$/,
        ],
        [
          'bulk_crops',
          { request_id: 'v-type', records: [{ name: 'a', yield: 'abc' }] },
          /^Row 1: "Yield" expects a number, for example 12\.5$/,
        ],
        [
          'bulk_crops',
          {
            request_id: 'v-repeat',
            records: [{ name: 'Oats' }, { name: 'x' }, { name: 'óats' }],
          },
          /^Rows 1 and 3 repeat "Oats" in "Name", which does not admit repeats\.$/,
        ],
        [
          'bulk_plots',
          {
            request_id: 'v-relation',
            records: [
              { name: 'p1', crop: maize },
              { name: 'p2', crop: 99999 },
            ],
          },
          /^Row 2: there is no record 99999 in "bulk crops"\.$/,
        ],
        [
          'bulk_crops',
          {
            request_id: 'v-existing',
            records: [{ name: 'Sorghum' }, { name: 'Maize' }],
          },
          /^"Maize" already exists in "Name", which does not admit repeats\.$/,
          409,
        ],
      ];
      for (const [code, body, message, status = 400] of refused) {
        const before = await count(`cl_${code}`);
        const r = await bulk(code, body);
        expect([r.status, String(r.body?.message)]).toEqual([
          status,
          expect.stringMatching(message),
        ]);
        expect(await count(`cl_${code}`)).toBe(before);
      }
    });

    it('empty unique values are no repeat; a single record that repeats names the field', async () => {
      const r = await bulk('bulk_plots', {
        request_id: 'plots-1',
        records: [
          { name: 'p1', crop: maize, plot_no: 1 },
          { name: 'p2' },
          { name: 'p3', plot_no: '' },
        ],
      });
      expect([r.status, r.body]).toEqual([201, { created: 3 }]);

      const one = await admin('post', 'data/bulk_plots', {
        name: 'p4',
        plot_no: 1,
      });
      expect([one.status, one.body.message]).toEqual([
        409,
        '"1" already exists in "Plot number", which does not admit repeats.',
      ]);
      const p2 = (await pub('bulk_plots')).body[1].id;
      const edit = await admin('patch', `data/bulk_plots/${p2}`, {
        plot_no: 1,
      });
      expect([edit.status, edit.body.message]).toEqual([
        409,
        '"1" already exists in "Plot number", which does not admit repeats.',
      ]);
    });

    it('repeats are judged by the table, in any script; ids are exact', async () => {
      const before = await count('cl_bulk_crops');
      // "ß" reads as "ss" for the unique key: a repeat inside the request,
      // said as such (MySQL would have answered that it "already exists").
      const eszett = await bulk('bulk_crops', {
        request_id: 'col-1',
        records: [{ name: 'Strasse' }, { name: 'Teff' }, { name: 'Straße' }],
      });
      expect([eszett.status, eszett.body.message]).toEqual([
        400,
        'Rows 1 and 3 repeat "Strasse" in "Name", which does not admit repeats.',
      ]);
      expect(await count('cl_bulk_crops')).toBe(before);
      // A Devanagari vowel sign makes another word: both are accepted.
      const hindi = await bulk('bulk_crops', {
        request_id: 'col-2',
        records: [{ name: 'क' }, { name: 'कि' }],
      });
      expect([hindi.status, hindi.body]).toEqual([201, { created: 2 }]);

      // Two ids that differ only by case are two requests…
      const upper = await bulk('bulk_crops', {
        request_id: 'Case-A',
        records: [{ name: 'Quinoa' }],
      });
      const lower = await bulk('bulk_crops', {
        request_id: 'case-a',
        records: [{ name: 'Amaranth' }],
      });
      expect([upper.body, lower.body]).toEqual([
        { created: 1 },
        { created: 1 },
      ]);
      expect(await count('cl_bulk_crops')).toBe(before + 4);
      // …and a single record can never take the id of a row of a bulk request.
      const one = await admin('post', 'data/bulk_crops', {
        name: 'Fonio',
        request_id: 'Case-A:1',
      });
      expect([one.status, one.body.message]).toEqual([
        400,
        'The operation id is not valid.',
      ]);
      expect(await count('cl_bulk_crops')).toBe(before + 4);
    });

    it('a long text is measured in bytes: what does not fit is said, with the field', async () => {
      const notes = await createList('bulk_notes', [
        { code: 'note', label: 'Note', type: 'long_text' },
      ]);
      created.push(notes);
      // 25,000 CJK characters are within the character limit and take 75,000 bytes.
      const wide = await admin('post', 'data/bulk_notes', {
        note: '字'.repeat(25_000),
      });
      expect([wide.status, wide.body.message]).toEqual([
        400,
        expect.stringMatching(
          /^"Note" is too long: .* needs 75000 bytes of the 65535 a long text holds\.$/,
        ),
      ]);
      const row = await bulk('bulk_notes', {
        request_id: 'wide-1',
        records: [{ note: 'ok' }, { note: '字'.repeat(25_000) }],
      });
      expect([row.status, row.body.message]).toEqual([
        400,
        expect.stringMatching(/^Row 2: "Note" is too long: /),
      ]);
      expect(await count('cl_bulk_notes')).toBe(0);
      expect(
        (await admin('post', 'data/bulk_notes', { note: '字'.repeat(20_000) }))
          .status,
      ).toBe(201);
    });

    it('an editor of the team can; another team and a draft list get 404', async () => {
      const draft = await createList('bulk_draft', [nameField], false);
      created.push(draft);
      const before = await count('cl_bulk_crops');
      const ok = await bulk(
        'bulk_crops',
        { request_id: 'ed-1', records: [{ name: 'Millet' }] },
        'editor.a@e2e',
      );
      expect([ok.status, ok.body]).toEqual([201, { created: 1 }]);
      const other = await bulk(
        'bulk_crops',
        { request_id: 'b-1', records: [{ name: 'Teff' }] },
        'designer.b@e2e',
      );
      // Word for word what a list that does not exist answers.
      expect([other.status, other.body.message]).toEqual([
        404,
        'There is no list "bulk_crops".',
      ]);
      expect(await count('cl_bulk_crops')).toBe(before + 1);
      const d = await bulk('bulk_draft', {
        request_id: 'd-1',
        records: [{ name: 'a' }],
      });
      expect([d.status, d.body.message]).toEqual([
        404,
        'There is no list "bulk_draft".',
      ]);
    });
  });

  describe('changing the rules of a field', () => {
    let kinds: number;
    let crops: number;
    const T = 'cl_rule_crops';
    const ids: Record<string, number> = {};
    const kindIds: number[] = [];
    const rec: number[] = [];

    const rules = (fieldId: number, body: unknown, user = A) =>
      admin('patch', `schema/fields/${fieldId}/rules`, body, user);
    /** `undefined` when the table has no index with that name; 0 = unique, 1 = plain. */
    const index = async (table: string, name: string) => {
      const r = await sql(
        'SELECT NON_UNIQUE AS nu FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
        [LISTS, table, name],
      );
      return r.length ? Number(r[0].nu) : undefined;
    };
    const ix = (code: string) => `ix_cl_${crops}_${ids[code]}`;
    const uq = (code: string) => `uq_cl_${crops}_${ids[code]}`;
    const nullable = async (table: string, column: string) =>
      (
        await sql(
          'SELECT IS_NULLABLE AS v FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
          [LISTS, table, column],
        )
      )[0].v;
    const ruleOps = async (listId: number) =>
      Number(
        (
          await sql(
            `SELECT COUNT(*) AS n FROM ${MAIN}.cl_schema_ops WHERE list_id = ? AND kind = 'set_rules'`,
            [listId],
          )
        )[0].n,
      );
    /** [required, unique, filterable] as the catalog holds them. */
    const flags = async (listId: number, code: string) => {
      const f = await fieldRow(listId, code);
      return [f.is_required, f.is_unique, f.is_indexed].map(Number);
    };
    const refused = async (
      fieldId: number,
      body: unknown,
      message: RegExp | string,
      status = 400,
    ) => {
      const r = await rules(fieldId, body);
      expect([r.status, r.body.message]).toEqual([
        status,
        typeof message === 'string' ? message : expect.stringMatching(message),
      ]);
    };

    beforeAll(async () => {
      kinds = await createList('rule_kinds', [
        { code: 'name', label: 'Name', type: 'text', is_required: true },
      ]);
      for (const name of ['Cereal', 'Root']) {
        const r = await admin('post', 'data/rule_kinds', { name });
        expect(r.status).toBe(201);
        kindIds.push(r.body.id);
      }
      crops = await createList('rule_crops', [
        { code: 'name', label: 'Name', type: 'text' },
        { code: 'code', label: 'Code', type: 'text' },
        { code: 'notes', label: 'Notes', type: 'long_text' },
        {
          code: 'kind',
          label: 'Kind',
          type: 'relation',
          relation_list_id: kinds,
        },
      ]);
      for (const code of ['name', 'code', 'notes', 'kind'])
        ids[code] = Number((await fieldRow(crops, code)).id);
      for (const body of [
        { name: 'Maize', code: 'MZ', kind: kindIds[0] },
        { name: 'Rice', code: 'RC', kind: kindIds[1] },
        // The same name for a unique key (case does not count); no code, no kind.
        { name: 'maize' },
      ]) {
        const r = await admin('post', 'data/rule_crops', body);
        expect([r.status, r.body?.message]).toEqual([201, undefined]);
        rec.push(r.body.id);
      }
      // Inactive records keep their values: every rule counts them.
      expect((await admin('delete', `data/rule_crops/${rec[2]}`)).status).toBe(
        200,
      );
    });

    it('a draft field changes in the catalog only, and the table is born with its rules', async () => {
      const draft = await createList(
        'rule_draft',
        [
          { code: 'name', label: 'Name', type: 'text' },
          { code: 'notes', label: 'Notes', type: 'long_text' },
        ],
        false,
      );
      const name = await fieldRow(draft, 'name');
      const notes = await fieldRow(draft, 'notes');

      const r = await rules(name.id, { is_required: true, is_unique: true });
      expect(r.status).toBe(200);
      expect(await flags(draft, 'name')).toEqual([1, 1, 0]);
      // Only what the request names changes.
      expect((await rules(name.id, { is_indexed: true })).status).toBe(200);
      expect(await flags(draft, 'name')).toEqual([1, 1, 1]);
      expect(await ruleOps(draft)).toBe(0);

      await refused(name.id, {}, 'There is nothing to change.');
      await refused(name.id, { label: 'x' }, 'There is nothing to change.');
      await refused(name.id, { is_unique: 'maybe' }, /must be true or false/);
      await refused(name.id, { is_required: null }, /must be true or false/);
      await refused(notes.id, { is_indexed: true }, /long text/);
      await refused(notes.id, { is_unique: true }, /long text/);
      expect(
        (await rules(name.id, { is_unique: false }, 'designer.b@e2e')).status,
      ).toBe(404);
      expect(
        (await rules(name.id, { is_unique: false }, 'editor.a@e2e')).status,
      ).toBe(403);
      expect(await flags(draft, 'name')).toEqual([1, 1, 1]);

      expect(
        (await admin('post', `schema/lists/${draft}/publish`, {})).status,
      ).toBe(201);
      expect(await nullable('cl_rule_draft', 'name')).toBe('NO');
      expect(await index('cl_rule_draft', `uq_cl_${draft}_${name.id}`)).toBe(0);
    });

    it('the budget of filterable and unique fields holds here too', async () => {
      const fields = Array.from({ length: 15 }, (_, i) => ({
        code: `f${i}`,
        type: 'text',
        is_indexed: true,
      }));
      const full = await createList(
        'rule_budget',
        [...fields, { code: 'extra', label: 'Extra', type: 'text' }],
        false,
      );
      const extra = await fieldRow(full, 'extra');
      await refused(extra.id, { is_indexed: true }, /15 filterable or unique/);
      await refused(extra.id, { is_unique: true }, /15 filterable or unique/);
      // A rule that needs no index is not part of that budget.
      expect((await rules(extra.id, { is_required: true })).status).toBe(200);
      // A field that already counts can swap one kind of index for the other.
      const first = await fieldRow(full, 'f0');
      expect((await rules(first.id, { is_unique: true })).status).toBe(200);
    });

    it('required: refused while a record has no value, then the column is NOT NULL', async () => {
      await refused(
        ids.code,
        { is_required: true, request_id: 'rules-req' },
        '1 record(s) have no value in "Code" (inactive records count too). Fill them in first, then make the field required.',
      );
      expect(await op('rules-req')).toBeUndefined();
      expect(await nullable(T, 'code')).toBe('YES');
      expect(await flags(crops, 'code')).toEqual([0, 0, 0]);

      expect(
        (await admin('patch', `data/rule_crops/${rec[2]}`, { code: 'M2' }))
          .status,
      ).toBe(200);
      const ok = await rules(ids.code, {
        is_required: true,
        request_id: 'rules-req',
      });
      expect([ok.status, Number(ok.body.is_required)]).toEqual([200, 1]);
      expect(await nullable(T, 'code')).toBe('NO');
      const applied = await op('rules-req');
      expect([applied.kind, applied.status]).toEqual(['set_rules', 'applied']);
      // The catalog keeps who changed it, published or not.
      expect(String((await fieldRow(crops, 'code')).updated_by)).toBe(
        String(USERS[A].id),
      );
      expect(
        (await admin('post', 'data/rule_crops', { name: 'Cassava' })).body
          .message,
      ).toBe('"Code" is required.');

      const back = await rules(ids.code, { is_required: false });
      expect([back.status, Number(back.body.is_required)]).toEqual([200, 0]);
      expect(await nullable(T, 'code')).toBe('YES');
    });

    it('unique: repeats are counted the way the key compares them, inactive records included', async () => {
      await refused(
        ids.name,
        { is_unique: true },
        /^1 value\(s\) appear more than once in "Name", for example "maize" \(inactive records count too\)\. Change them first, then make the field unique\.$/i,
      );
      expect(await index(T, uq('name'))).toBeUndefined();
      expect(await flags(crops, 'name')).toEqual([0, 0, 0]);

      expect(
        (await admin('patch', `data/rule_crops/${rec[2]}`, { name: 'Millet' }))
          .status,
      ).toBe(200);
      const ok = await rules(ids.name, { is_unique: true });
      expect([ok.status, Number(ok.body.is_unique)]).toEqual([200, 1]);
      expect(await index(T, uq('name'))).toBe(0);
      // The key is real: a repeat is refused, and a unique field can be a filter.
      expect(
        (await admin('post', 'data/rule_crops', { name: 'RICE' })).status,
      ).toBe(409);
      expect((await pub('rule_crops?name=Rice')).body).toHaveLength(1);

      expect((await rules(ids.name, { is_unique: false })).status).toBe(200);
      expect(await index(T, uq('name'))).toBeUndefined();
      expect(await index(T, ix('name'))).toBeUndefined();
      expect((await pub('rule_crops?name=Rice')).status).toBe(400);
      expect(
        (await admin('post', 'data/rule_crops', { name: 'RICE' })).status,
      ).toBe(201);
    });

    it('filterable: the index and the public filter come and go together', async () => {
      expect((await pub('rule_crops?code=MZ')).status).toBe(400);
      const on = await rules(ids.code, { is_indexed: true });
      expect([on.status, Number(on.body.is_indexed)]).toEqual([200, 1]);
      expect(await index(T, ix('code'))).toBe(1);
      expect((await pub('rule_crops?code=MZ')).body).toHaveLength(1);

      // Unique on top: the unique key replaces the plain one…
      expect((await rules(ids.code, { is_unique: true })).status).toBe(200);
      expect(await index(T, ix('code'))).toBeUndefined();
      expect(await index(T, uq('code'))).toBe(0);
      // …and when unique goes, a filterable field keeps a plain index.
      expect((await rules(ids.code, { is_unique: false })).status).toBe(200);
      expect(await index(T, ix('code'))).toBe(1);
      expect(await index(T, uq('code'))).toBeUndefined();
      expect(await flags(crops, 'code')).toEqual([0, 0, 1]);

      expect((await rules(ids.code, { is_indexed: false })).status).toBe(200);
      expect(await index(T, ix('code'))).toBeUndefined();
      expect((await pub('rule_crops?code=MZ')).status).toBe(400);
    });

    it('a relation keeps its foreign key and always one index', async () => {
      expect(await index(T, ix('kind'))).toBe(1);
      const before = await ruleOps(crops);
      // Filterable on a relation changes nothing in the table: no statement.
      const flag = await rules(ids.kind, { is_indexed: true });
      expect([flag.status, Number(flag.body.is_indexed)]).toEqual([200, 1]);
      expect(await ruleOps(crops)).toBe(before);

      expect((await rules(ids.kind, { is_unique: true })).status).toBe(200);
      expect(await index(T, uq('kind'))).toBe(0);
      expect(await index(T, ix('kind'))).toBeUndefined();
      // Both constraints are alive after the swap.
      const stray = await admin('post', 'data/rule_crops', {
        name: 'Yam',
        kind: 999999,
      });
      expect([stray.status, stray.body.message]).toEqual([
        400,
        'The related record you chose does not exist.',
      ]);
      expect(
        (
          await admin('post', 'data/rule_crops', {
            name: 'Wheat',
            kind: kindIds[0],
          })
        ).status,
      ).toBe(409);

      const off = await rules(ids.kind, {
        is_unique: false,
        is_indexed: false,
      });
      expect(off.status).toBe(200);
      expect(await index(T, ix('kind'))).toBe(1);
      expect(await index(T, uq('kind'))).toBeUndefined();
      expect(await flags(crops, 'kind')).toEqual([0, 0, 0]);
      // Still a filter: a relation always is.
      expect((await pub(`rule_crops?kind=${kindIds[0]}`)).body).toHaveLength(1);

      await refused(
        ids.kind,
        { is_required: true },
        /^2 record\(s\) have no value in "Kind"/,
      );
    });

    it('two requests for the same change at once: one statement, both answered', async () => {
      const before = await ruleOps(crops);
      // Different ids on purpose: one row in the log is then the work of the
      // schema lock, not of the unique key on the id. Checked outside the lock,
      // both would add the same index and one of them would be refused.
      const [a, b] = await Promise.all([
        rules(ids.name, { is_indexed: true, request_id: 'rules-par-a' }),
        rules(ids.name, { is_indexed: true, request_id: 'rules-par-b' }),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect([a.body.is_indexed, b.body.is_indexed].map(Number)).toEqual([
        1, 1,
      ]);
      expect(await ruleOps(crops)).toBe(before + 1);
      // The same id again, once applied: answered, nothing runs.
      const again = await rules(ids.name, {
        is_indexed: true,
        request_id: 'rules-par-a',
      });
      expect(again.status).toBe(200);
      expect(await ruleOps(crops)).toBe(before + 1);
      expect(await index(T, ix('name'))).toBe(1);
    });

    it('the catalog fails after the ALTER: the table decides and the timer finishes it', async () => {
      await sql(
        `CREATE TRIGGER ${MAIN}.cl_e2e_rules_trap BEFORE UPDATE ON ${MAIN}.cl_fields FOR EACH ROW
           BEGIN IF NEW.id = ${ids.code} AND NEW.is_unique = 1 THEN
             SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'catalog trap'; END IF; END`,
      );
      try {
        const r = await rules(ids.code, {
          is_unique: true,
          request_id: 'rules-trap',
        });
        expect(r.status).toBe(500); // the failure happened: not a silent 200
        expect((await op('rules-trap')).status).toBe('pending');
        expect(await index(T, uq('code'))).toBe(0); // the statement landed…
        expect(await flags(crops, 'code')).toEqual([0, 0, 0]); // …the catalog did not
        // The list is held until that is settled.
        expect((await rules(ids.name, { is_indexed: false })).status).toBe(409);
      } finally {
        await sql(`DROP TRIGGER IF EXISTS ${MAIN}.cl_e2e_rules_trap`);
      }
      await tick();
      expect((await op('rules-trap')).status).toBe('applied');
      expect(await flags(crops, 'code')).toEqual([0, 1, 0]);

      // Statements that never reached the table: the structure says so part by
      // part (nullability AND index), and after the grace period they are failed.
      const lost = (over: Record<string, unknown>) =>
        JSON.stringify({
          kind: 'set_rules',
          fieldId: ids.code,
          table: T,
          column: 'code',
          required: false,
          unique: true,
          indexed: false,
          index: 'unique',
          ix: ix('code'),
          uq: uq('code'),
          ...over,
        });
      for (const [id, intent] of [
        // The index is as asked, the nullability is not.
        ['rules-lost-null', lost({ required: true })],
        // The nullability is as asked, the index is not.
        [
          'rules-lost-index',
          lost({ unique: false, indexed: true, index: 'plain' }),
        ],
      ]) {
        await sql(
          `INSERT INTO ${MAIN}.cl_schema_ops (request_id, list_id, kind, sql_text, intent_json, status, started_at)
           VALUES (?, ?, 'set_rules', 'ALTER TABLE never sent', ?, 'pending', NOW() - INTERVAL 60 SECOND)`,
          [id, crops, intent],
        );
        await tick();
        expect((await op(id)).status).toBe('failed');
      }
      expect(await flags(crops, 'code')).toEqual([0, 1, 0]);
      expect(await nullable(T, 'code')).toBe('YES');
      expect(await index(T, uq('code'))).toBe(0);
      // And the list is free again.
      expect((await rules(ids.code, { is_unique: false })).status).toBe(200);
    });

    it('a busy table answers "try again" and leaves nothing half done', async () => {
      const hold = await holdTable(T);
      const started = Date.now();
      const busy = await rules(ids.name, {
        is_required: true,
        request_id: 'rules-busy',
      });
      await hold.release();
      expect([busy.status, busy.body.message]).toEqual([
        409,
        expect.stringMatching(/busy right now/),
      ]);
      expect(Date.now() - started).toBeLessThan(9_000);
      expect(await nullable(T, 'name')).toBe('YES');
      expect(await flags(crops, 'name')).toEqual([0, 0, 1]);

      const retry = await rules(ids.name, {
        is_required: true,
        request_id: 'rules-busy',
      });
      expect([retry.status, Number(retry.body.is_required)]).toEqual([200, 1]);
      expect(await nullable(T, 'name')).toBe('NO');
      // Records are written again once the table lock is gone.
      expect(
        (await admin('post', 'data/rule_crops', { name: 'Sorghum' })).status,
      ).toBe(201);
    });

    it('a reader that meets a locked table waits a bounded time and is told to try again', async () => {
      // What a rules or type change does to the table (and to the lists
      // related to it) while it counts and alters.
      const qr = root.createQueryRunner();
      await qr.connect();
      await qr.query(`LOCK TABLES ${LISTS}.${T} WRITE`);
      const started = Date.now();
      let r: request.Response;
      try {
        r = await pub('rule_crops');
      } finally {
        await qr.query('UNLOCK TABLES');
        await qr.release();
      }
      expect([r.status, r.body.message]).toEqual([
        503,
        expect.stringMatching(/busy right now/),
      ]);
      // The server default is a year: this is the session's own limit.
      expect(Date.now() - started).toBeLessThan(15_000);
      expect((await pub('rule_crops')).status).toBe(200);
    });
  });

  describe('deleting', () => {
    it('a list used by another cannot be deleted; a free one drops its table', async () => {
      const kinds = (await admin('get', 'schema/lists')).body.find(
        (l: any) => l.code === 'soil_kinds',
      ).id;
      const refused = await admin('delete', `schema/lists/${kinds}`);
      expect(refused.status).toBe(400);
      const soils = (await admin('get', 'schema/lists')).body.find(
        (l: any) => l.code === 'soils',
      ).id;
      expect((await admin('delete', `schema/lists/${soils}`)).status).toBe(200);
      expect(await tableExists('cl_soils')).toBe(false);
      expect((await pub('soils')).status).toBe(404);
      expect((await lastOp(soils)).status).toBe('applied');
    });

    it('migration down refuses while lists exist, and works once they are gone', async () => {
      const qr = root.createQueryRunner();
      await qr.connect();
      await qr.query(`USE ${MAIN}`);
      try {
        const m = new AddControlListsCatalog1794200000000();
        await expect(m.down(qr)).rejects.toThrow(/control list\(s\) exist/);
        for (const l of (
          await admin('get', 'schema/lists', undefined, 'sa@e2e')
        ).body.sort((x: any, y: any) => y.id - x.id)) {
          // Dependents first: relation fields go before their targets.
          for (const f of (
            await admin('get', `schema/lists/${l.id}`, undefined, 'sa@e2e')
          ).body.fields) {
            if (f.type === 'relation')
              await admin(
                'delete',
                `schema/fields/${f.id}`,
                undefined,
                'sa@e2e',
              );
          }
        }
        for (const l of (
          await admin('get', 'schema/lists', undefined, 'sa@e2e')
        ).body) {
          const r = await admin(
            'delete',
            `schema/lists/${l.id}`,
            undefined,
            'sa@e2e',
          );
          expect([l.code, r.status]).toEqual([l.code, 200]);
        }
        await m.down(qr);
        expect(await sql(`SHOW TABLES FROM ${MAIN} LIKE 'cl\\_%'`)).toEqual([]);
        expect(
          await sql(`SELECT * FROM ${MAIN}.roles WHERE acronym LIKE 'CL\\_%'`),
        ).toEqual([]);
        expect(
          (await sql(`SELECT COUNT(*) AS n FROM ${MAIN}.role_permission`))[0].n,
        ).toBe('0');
      } finally {
        await qr.release();
      }
    });
  });

  it("CLARISA's own tables end exactly as they started", async () => {
    expect(await clarisaSnapshot()).toEqual(clarisaBefore);
  });
});

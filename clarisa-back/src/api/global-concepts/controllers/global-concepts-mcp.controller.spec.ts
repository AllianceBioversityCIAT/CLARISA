import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GlobalConceptsMcpController } from './global-concepts-mcp.controller';
import { GlobalConceptsPublicController } from './global-concepts-public.controller';
import { McpService } from '../services/mcp.service';
import { ConceptsSuggestService } from '../services/concepts-suggest.service';
import { ConceptsReadService } from '../services/concepts-read.service';
import { ConceptsExportService } from '../services/concepts-export.service';

/** The transport over real HTTP: status codes, raw JSON-RPC, route order. */
describe('GlobalConceptsMcpController (HTTP)', () => {
  let app: INestApplication;
  const read = {
    list: jest.fn(async () => []),
    get: jest.fn(),
    releases: jest.fn(async () => []),
    scheme: jest.fn(async () => ({ code: 'mcp' })),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [
        GlobalConceptsMcpController,
        GlobalConceptsPublicController,
      ],
      providers: [
        McpService,
        ConceptsSuggestService,
        { provide: ConceptsReadService, useValue: read },
        { provide: ConceptsExportService, useValue: {} },
      ],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('answers initialize with plain JSON-RPC, not wrapped', async () => {
    const res = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toMatchObject({ jsonrpc: '2.0', id: 1 });
    expect(res.body.result.serverInfo.name).toBe('clarisa-global-concepts');
  });

  it('accepts a notification with 202 and no body', async () => {
    const res = await request(app.getHttpServer())
      .post('/mcp')
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res.status).toBe(202);
    expect(res.text).toBe('');
  });

  it('answers GET with 405 instead of reaching the :scheme route', async () => {
    const res = await request(app.getHttpServer()).get('/mcp');
    expect(res.status).toBe(405);
    expect(read.scheme).not.toHaveBeenCalled();
  });

  it('suggests over POST with the text in the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/meliaf/suggest')
      .send({ text: 'impact assessment' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ scheme: 'meliaf', retained: false });
  });
});

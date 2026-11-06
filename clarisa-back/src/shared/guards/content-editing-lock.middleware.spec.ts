import {
  Controller,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  Patch,
  Post,
  Get,
  Delete,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ExceptionsFilter } from '../filters/exceptions.filter';
import { SettingsService } from '../../api/settings/settings.service';
import {
  CONTENT_EDITING_LOCKED_MESSAGE,
  ContentEditingLockMiddleware,
  isLockedWrite,
} from './content-editing-lock.middleware';

describe('isLockedWrite: what the editing lock holds back', () => {
  it.each([
    ['POST', '/api/glossary/admin/terms'],
    ['PATCH', '/api/glossary/admin/terms/391'],
    ['PATCH', '/api/glossary/admin/terms/391/status'],
    ['POST', '/api/glossary/admin/terms/391/versions'],
    ['DELETE', '/api/glossary/admin/terms/391/group'],
    ['POST', '/api/glossary/admin/bulk/import'],
    ['PATCH', '/api/glossary/update'],
    ['PATCH', '/api/glossary/update?x=1'],
    ['POST', '/api/meliaf-taxonomy/admin/concepts'],
    ['PATCH', '/api/meliaf-taxonomy/admin/concepts/2374'],
    ['PUT', '/api/meliaf-taxonomy/admin/concepts/2374/labels'],
    ['POST', '/api/meliaf-taxonomy/admin/import'],
    ['POST', '/api/meliaf-taxonomy/admin/requests/12/transition'],
    ['POST', '/api/meliaf-taxonomy/admin/releases'],
    ['POST', '/api/meliaf-taxonomy/admin/collections'],
    ['PATCH', '/api/meliaf-taxonomy/admin/fields/3'],
    ['POST', '/api/meliaf-taxonomy/platform/concepts'],
    ['PATCH', '/api/meliaf-taxonomy/platform/concepts/2374'],
    ['POST', '/api/meliaf-taxonomy/platform/requests/12/transition'],
    ['post', '/API/Glossary/Admin/terms'],
    ['POST', '//api//glossary/admin/terms'],
  ])('%s %s is held back', (method, url) => {
    expect(isLockedWrite(method, url)).toBe(true);
  });

  it.each([
    ['GET', '/api/glossary/admin/terms'],
    ['GET', '/api/glossary'],
    ['HEAD', '/api/meliaf-taxonomy/admin/concepts'],
    ['POST', '/api/glossary/admin/bulk/preview'],
    ['POST', '/api/meliaf-taxonomy/admin/import/preview'],
    ['POST', '/api/meliaf-taxonomy/admin/ai/semantic-search'],
    ['POST', '/api/meliaf-taxonomy/admin/concepts-assist/chat'],
    ['POST', '/api/meliaf-taxonomy/requests/start'],
    ['POST', '/api/meliaf-taxonomy/requests'],
    ['POST', '/api/meliaf-taxonomy/platform/requests'],
    ['POST', '/api/meliaf-taxonomy/suggest'],
    ['PATCH', '/api/settings/content-editing'],
    ['PATCH', '/api/users/update'],
    ['POST', '/api/glossary-admin-unrelated'],
  ])('%s %s stays open', (method, url) => {
    expect(isLockedWrite(method, url)).toBe(false);
  });
});

@Controller('api/glossary')
class FakeGlossaryController {
  @Post('admin/terms') create() {
    return { created: true };
  }
  @Get('admin/terms') list() {
    return [];
  }
  @Patch('update') update() {
    return [];
  }
  @Delete('admin/terms/1/group') ungroup() {
    return {};
  }
}

describe('ContentEditingLockMiddleware over HTTP (production exception filter)', () => {
  let app: INestApplication;
  const settings = { isContentEditingLocked: jest.fn() };

  @Module({
    controllers: [FakeGlossaryController],
    providers: [
      { provide: SettingsService, useValue: settings },
      { provide: APP_FILTER, useClass: ExceptionsFilter },
    ],
  })
  class TestModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer
        .apply(ContentEditingLockMiddleware)
        .forRoutes(
          { path: 'api/*', method: RequestMethod.POST },
          { path: 'api/*', method: RequestMethod.PATCH },
          { path: 'api/*', method: RequestMethod.DELETE },
        );
    }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => settings.isContentEditingLocked.mockReset());

  it('locked: a write is a 423 with the message, and never reaches the controller', async () => {
    settings.isContentEditingLocked.mockResolvedValue(true);
    const res = await request(app.getHttpServer()).post(
      '/api/glossary/admin/terms',
    );
    expect(res.status).toBe(423);
    expect(res.body.message).toBe(CONTENT_EDITING_LOCKED_MESSAGE);
    expect(res.body.created).toBeUndefined();
    const patch = await request(app.getHttpServer()).patch(
      '/api/glossary/update',
    );
    expect(patch.status).toBe(423);
    const del = await request(app.getHttpServer()).delete(
      '/api/glossary/admin/terms/1/group',
    );
    expect(del.status).toBe(423);
  });

  it('locked: reading still works', async () => {
    settings.isContentEditingLocked.mockResolvedValue(true);
    const res = await request(app.getHttpServer()).get(
      '/api/glossary/admin/terms',
    );
    expect(res.status).toBe(200);
  });

  it('unlocked: the write goes through', async () => {
    settings.isContentEditingLocked.mockResolvedValue(false);
    const res = await request(app.getHttpServer()).post(
      '/api/glossary/admin/terms',
    );
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ created: true });
  });

  it('a lock that cannot be read fails the write instead of letting it through', async () => {
    settings.isContentEditingLocked.mockRejectedValue(new Error('db down'));
    const res = await request(app.getHttpServer()).post(
      '/api/glossary/admin/terms',
    );
    expect(res.status).toBe(500);
    expect(res.body.created).toBeUndefined();
  });
});

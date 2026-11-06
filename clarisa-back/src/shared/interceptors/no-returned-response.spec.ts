import {
  ClassSerializerInterceptor,
  INestApplication,
  HttpStatus,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import request from 'supertest';
import { ExceptionsFilter } from '../filters/exceptions.filter';
import { ResponseFormattingInterceptor } from './response-formatting.interceptor';
import { GlossaryController } from '../../api/glossary/glossary.controller';
import { GlossaryService } from '../../api/glossary/glossary.service';
import { GlossaryExportService } from '../../api/glossary/glossary-export.service';

/**
 * A handler that writes the reply itself (`@Res()`) and also RETURNS the
 * Express response hands that object to `ClassSerializerInterceptor`, which
 * fails on it; the exception filter then writes a second reply and Node 22
 * aborts the process (ERR_INTERNAL_ASSERTION). One anonymous
 * `PATCH api/<catalog>/update` took the whole API down (2026-11-06).
 */
describe('no handler returns the Express response it already wrote', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
  const src = join(__dirname, '..', '..');

  it('controllers under ClassSerializerInterceptor never `return res.…`', () => {
    const offenders = files(src)
      .filter((f) => f.endsWith('.controller.ts'))
      .filter((f) =>
        readFileSync(f, 'utf8').includes('ClassSerializerInterceptor'),
      )
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ line, i }))
          .filter(({ line }) => /\breturn\s+(await\s+)?res\s*\./.test(line))
          .map(({ i }) => `${relative(src, f)}:${i + 1}`),
      );
    expect(offenders).toEqual([]);
  });

  describe('PATCH api/glossary/update over HTTP, production interceptors and filter', () => {
    let app: INestApplication;
    const service = {
      update: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    const filterCatch = jest.spyOn(ExceptionsFilter.prototype, 'catch');

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [GlossaryController],
        providers: [
          { provide: GlossaryService, useValue: service },
          { provide: GlossaryExportService, useValue: { export: jest.fn() } },
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          { provide: APP_INTERCEPTOR, useClass: ResponseFormattingInterceptor },
          { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      filterCatch.mockRestore();
      await app.close();
    });

    beforeEach(() => filterCatch.mockClear());

    it('a successful update answers once: 200 with the result, no error path', async () => {
      service.update.mockResolvedValue([]);
      const res = await request(app.getHttpServer()).patch('/update').send([]);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toEqual([]);
      expect(filterCatch).not.toHaveBeenCalled();
    });

    it('a failing update answers once: 400 through the filter', async () => {
      service.update.mockRejectedValue(new Error('bad'));
      const res = await request(app.getHttpServer()).patch('/update').send([]);
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(filterCatch).toHaveBeenCalledTimes(1);
    });
  });
});

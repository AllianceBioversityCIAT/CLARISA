import { Test, TestingModule } from '@nestjs/testing';
import { AdministrativeScaleController } from './administrative-scale.controller';
import { HttpStatus } from '@nestjs/common';
import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('AdministrativeScaleController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdministrativeScaleController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('should redirect to geographic-scopes with status 301', () => {
    return supertest(app.getHttpServer())
      .get('/')
      .expect(HttpStatus.MOVED_PERMANENTLY)
      .expect('Location', 'geographic-scopes?type=one-cgiar');
  });

  afterAll(async () => {
    await app.close();
  });
});

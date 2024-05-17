import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Business Category (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/business-categories (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/business-categories')
      .expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/business-categories/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/business-categories/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/business-categories/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/business-categories/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Environmental benefits (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/environmental-benefits (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/environmental-benefits')
      .expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/environmental-benefits/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/environmental-benefits/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/environmental-benefits/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/environmental-benefits/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

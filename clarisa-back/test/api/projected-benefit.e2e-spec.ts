import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Projected Benefits (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/projected-benefits (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/projected-benefits')
      .expect(200);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/projected-benefits/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/projected-benefits/get/' + 1)
      .expect(200)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('impact_area_indicator_id');
        expect(data).toHaveProperty('description');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/projected-benefits/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/projected-benefits/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

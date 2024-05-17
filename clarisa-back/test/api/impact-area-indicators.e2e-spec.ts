import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Impact Area indicators (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/impact-area-indicators (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/impact-area-indicators')
      .expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/impact-area-indicators/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/impact-area-indicators/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('indicatorId');
        expect(data).toHaveProperty('indicatorStatement');
        expect(data).toHaveProperty('targetYear');
        expect(data).toHaveProperty('targetUnit');
        expect(data).toHaveProperty('value');
        expect(data).toHaveProperty('isAplicableProjectedBenefits');
        expect(data).toHaveProperty('impactAreaId');
        expect(data).toHaveProperty('impactAreaName');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/impact-area-indicators/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/impact-area-indicators/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

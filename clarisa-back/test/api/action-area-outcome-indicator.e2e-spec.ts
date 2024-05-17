import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Action area outcome indicators (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/action-area-outcome-indicators (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/action-area-outcome-indicators')
      .expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/action-area-outcome-indicators/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/action-area-outcome-indicators/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('action_area_outcome_id');
        expect(data).toHaveProperty('outcome_indicator_id');
        expect(data).toHaveProperty('action_area_id');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/action-area-outcome-indicators/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/action-area-outcome-indicators/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

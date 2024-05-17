import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('SDG indicators (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/sdg-indicators (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/sdg-indicators')
      .expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/sdg-indicators/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/sdg-indicators/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('unsdIndicatorCode');
        expect(data).toHaveProperty('indicatorCode');
        expect(data).toHaveProperty('indicatorName');
        expect(data).toHaveProperty('sdg_target_id');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/sdg-indicators/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/sdg-indicators/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Region (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/regions/un-regions (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/regions/un-regions')
      .expect(HttpStatus.OK);
  });

  it('/api/regions/one-cgiar-regions (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/regions/one-cgiar-regions')
      .expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/regions/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/regions/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('iso_numeric');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('acronym');
        expect(data).toHaveProperty('region_type_id');
        expect(data).toHaveProperty('parent_id');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/regions/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/regions/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

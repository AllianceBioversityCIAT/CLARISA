import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Units (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/units (GET)', () => {
    return request(app.getHttpServer()).get('/api/units').expect(HttpStatus.OK);
  }, 30000);

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/units/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/units/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('financial_code');
        expect(data).toHaveProperty('description');
        expect(data).toHaveProperty('parent_id');
        expect(data).toHaveProperty('science_group_id');
        expect(data).toHaveProperty('unit_type_id');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/units/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/units/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

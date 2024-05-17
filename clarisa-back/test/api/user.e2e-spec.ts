import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('User (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/users (GET)', () => {
    return request(app.getHttpServer()).get('/api/users').expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/users/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/users/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('first_name');
        expect(data).toHaveProperty('last_name');
        expect(data).toHaveProperty('username');
        expect(data).toHaveProperty('email');
        expect(data).toHaveProperty('password');
        expect(data).toHaveProperty('is_cgiar_user');
        expect(data).toHaveProperty('last_login');
        expect(data).toHaveProperty('agree_terms');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/users/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/users/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

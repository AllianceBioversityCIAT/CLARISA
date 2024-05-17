import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Workpackages (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/workpackages (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/workpackages')
      .expect(HttpStatus.OK);
  }, 30000);

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/workpackages/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/workpackages/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('results');
        expect(data).toHaveProperty('pathway_content');
        expect(data).toHaveProperty('is_global_dimension');
        expect(data).toHaveProperty('submission_tool_initiative_stage_id');
        expect(data).toHaveProperty('acronym');
        expect(data).toHaveProperty('wp_official_code');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/workpackages/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/workpackages/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

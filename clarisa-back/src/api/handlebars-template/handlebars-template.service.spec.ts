import { Test, TestingModule } from '@nestjs/testing';
import { HandlebarsTemplateService } from './handlebars-template.service';

describe('HandlebarsTemplateService', () => {
  let service: HandlebarsTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HandlebarsTemplateService],
    }).compile();

    service = module.get<HandlebarsTemplateService>(HandlebarsTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

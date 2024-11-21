import { Test, TestingModule } from '@nestjs/testing';
import { HandlebarsTemplateController } from './handlebars-template.controller';
import { HandlebarsTemplateService } from './handlebars-template.service';

describe('HandlebarsTemplateController', () => {
  let controller: HandlebarsTemplateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HandlebarsTemplateController],
      providers: [HandlebarsTemplateService],
    }).compile();

    controller = module.get<HandlebarsTemplateController>(
      HandlebarsTemplateController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

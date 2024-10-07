import { Module } from '@nestjs/common';
import { HandlebarsTemplateService } from './handlebars-template.service';
import { HandlebarsTemplateController } from './handlebars-template.controller';
import { HandlebarsTemplateRepository } from './repositories/handlebars-template.repository';

@Module({
  controllers: [HandlebarsTemplateController],
  providers: [HandlebarsTemplateService, HandlebarsTemplateRepository],
  exports: [HandlebarsTemplateService, HandlebarsTemplateRepository],
})
export class HandlebarsTemplateModule {}

import { PartialType } from '@nestjs/swagger';
import { CreateHandlebarsTemplateDto } from './create-handlebars-template.dto';

export class UpdateHandlebarsTemplateDto extends PartialType(CreateHandlebarsTemplateDto) {}

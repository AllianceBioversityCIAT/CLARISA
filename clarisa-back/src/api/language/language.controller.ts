import {
  Controller,
  Get,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { LanguageService } from './language.service';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  findAll() {
    return this.languageService.findAll();
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.languageService.findOne(+id);
  }
}

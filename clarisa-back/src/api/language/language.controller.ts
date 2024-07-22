import {
  Controller,
  Get,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { LanguageService } from './language.service';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { LanguageDto } from './dto/language.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all languages. Defaults to active.',
  })
  @ApiOkResponse({ type: [LanguageDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return this.languageService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the language',
  })
  @ApiOkResponse({ type: [LanguageDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.languageService.findOne(+id);
  }
}

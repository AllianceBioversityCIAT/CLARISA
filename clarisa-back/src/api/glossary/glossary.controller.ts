import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { GlossaryService } from './glossary.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Immutable } from '../../shared/utils/deep-immutable';
import { Glossary } from './entities/glossary.entity';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GlossaryController {
  constructor(private readonly glossaryService: Immutable<GlossaryService>) {}

  @Get()
  findAll(@Query('show') show: FindAllOptions): Promise<Glossary[]> {
    return this.glossaryService.findAll(show);
  }

  @Get('/dashboard')
  findAllForDashboard(
    @Query('show') show: FindAllOptions,
  ): Promise<Glossary[]> {
    return this.glossaryService.findAll(show, true);
  }

  @Get('get/:id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Glossary | null> {
    return await this.glossaryService.findOne(id);
  }
}

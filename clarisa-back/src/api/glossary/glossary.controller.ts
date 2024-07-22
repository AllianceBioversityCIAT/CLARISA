import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  HttpException,
  HttpStatus,
  Res,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { GlossaryService } from './glossary.service';
import { UpdateGlossaryDto } from './dto/update-glossary.dto';
import { Glossary } from './entities/glossary.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GlossaryDto } from './dto/glossary.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Glossary')
export class GlossaryController {
  constructor(private readonly glossaryService: GlossaryService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all terms of the glossary. Defaults to active.',
  })
  @ApiOkResponse({ type: [GlossaryDto] })
  findAll(@Query('show') show: FindAllOptions) {
    return this.glossaryService.findAll(show);
  }

  @Get('/dashboard')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all terms of the glossary (only used by the dashboard). Defaults to active.',
  })
  @ApiOkResponse({ type: [GlossaryDto] })
  findAllForDashboard(@Query('show') show: FindAllOptions) {
    return this.glossaryService.findAll(show, true);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the term of the glossary',
  })
  @ApiOkResponse({ type: [GlossaryDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.glossaryService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateGlossaryDto: UpdateGlossaryDto[],
  ) {
    try {
      const result: Glossary[] =
        await this.glossaryService.update(updateGlossaryDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

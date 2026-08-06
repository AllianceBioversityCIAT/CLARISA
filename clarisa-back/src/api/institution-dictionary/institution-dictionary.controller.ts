import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InstitutionDictionaryService } from './institution-dictionary.service';
import { Response } from 'express';
import { UpdateInstitutionDictionaryDto } from './dto/update-institution-dictionary.dto';
import { InstitutionDictionary } from './entities/institution-dictionary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Institution Dictionary')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class InstitutionDictionaryController {
  constructor(
    private readonly institutionDictionaryService: InstitutionDictionaryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List related institutions (dictionary)',
    description:
      'Dictionary of institution name variants / aliases mapped to their canonical institution, used to reconcile institution names across CGIAR systems.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.institutionDictionaryService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionDictionaryService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateInstitutionDictionaryDto[],
  ) {
    try {
      const result: InstitutionDictionary[] =
        await this.institutionDictionaryService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

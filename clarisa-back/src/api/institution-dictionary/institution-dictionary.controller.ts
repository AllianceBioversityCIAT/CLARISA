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
import { InstitutionDictionaryService } from './institution-dictionary.service';
import { Response } from 'express';
import { UpdateInstitutionDictionaryDto } from './dto/update-institution-dictionary.dto';
import { InstitutionDictionary } from './entities/institution-dictionary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InstitutionDictionaryDto } from './dto/institution-dictionary.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Institution Dictionary')
export class InstitutionDictionaryController {
  constructor(
    private readonly institutionDictionaryService: InstitutionDictionaryService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all institutions. Defaults to active.',
  })
  @ApiOkResponse({ type: [InstitutionDictionaryDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.institutionDictionaryService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the institution',
  })
  @ApiOkResponse({ type: [InstitutionDictionaryDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionDictionaryService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

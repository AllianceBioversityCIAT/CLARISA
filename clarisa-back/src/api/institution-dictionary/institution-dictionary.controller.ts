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
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InstitutionDictionaryDto } from './dto/institution-dictionary.dto';
import { BaseParamsDto } from '../../shared/entities/dtos/base-params.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Institution Dictionary')
export class InstitutionDictionaryController {
  constructor(
    private readonly institutionDictionaryService: InstitutionDictionaryService,
  ) {}

  @Get()
  @ApiQuery({
    type: BaseParamsDto,
  })
  @ApiOkResponse({ type: [InstitutionDictionaryDto] })
  @ApiOperation({
    summary:
      'Get all institutions and existing equivalents in other systems, optionally filtered by status. These last two parameters, despite being required in Swagger (due to performance reasons), are optional otherwise.',
  })
  async findAll(
    @Query('show') show,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?,
  ) {
    return await this.institutionDictionaryService.findAll(show, offset, limit);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description:
      'The id of the institution and existing equivalents in other systems',
  })
  @ApiOkResponse({ type: [InstitutionDictionaryDto] })
  @ApiOperation({
    summary: 'Get an institution by id',
  })
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

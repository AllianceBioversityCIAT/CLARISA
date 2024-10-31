import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { Response } from 'express';
import { Institution } from './entities/institution.entity';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InstitutionDto } from './dto/institution.dto';
import { InstitutionSimpleDto } from './dto/institution-simple.dto';
import { InstitutionFindAllParams } from './dto/institution-find-all-params.dto';
import { BaseParamsDto } from '../../shared/entities/dtos/base-params.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Institutions')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  @ApiQuery({
    type: InstitutionFindAllParams,
  })
  @ApiOkResponse({ type: [InstitutionDto] })
  @ApiOperation({
    summary:
      'Get all institutions, optionally filtered by status, date of creation, offset and limit. These last two parameters, despite being required in Swagger (due to performance reasons), are optional otherwise.',
  })
  async findAll(
    @Query('show') show,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?,
    @Query('from', new ParseIntPipe({ optional: true }))
    from?,
  ) {
    return await this.institutionService.findAll(show, offset, limit, from);
  }

  @Get('simple')
  @ApiQuery({
    type: BaseParamsDto,
  })
  @ApiOkResponse({ type: [InstitutionSimpleDto] })
  @ApiOperation({
    summary:
      'Get all institutions with flattened data, optionally filtered by status, offset and limit. These last two parameters, despite being required in Swagger (due to performance reasons), are optional otherwise.',
  })
  async findAllSimple(
    @Query('show') show,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?,
  ) {
    return await this.institutionService.findAllSimple(show, offset, limit);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the institution',
  })
  @ApiOkResponse({ type: [InstitutionDto] })
  @ApiOperation({
    summary: 'Get an institution by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionService.findOne(id);
  }

  @Get('simple/:id')
  async findOneSimple(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionService.findOneSimple(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateInstitutionDto[],
  ) {
    try {
      const result: Institution[] =
        await this.institutionService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

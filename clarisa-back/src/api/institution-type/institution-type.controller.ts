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
import { InstitutionTypeService } from './institution-type.service';
import { UpdateInstitutionTypeDto } from './dto/update-institution-type.dto';
import { Response } from 'express';
import { InstitutionType } from './entities/institution-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InstitutionTypeDto } from './dto/institution-type.dto';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { InstitutionTypeFromParentDto } from './dto/institution-type-from-parent.dto';
import { SimpleInstitutionTypeDto } from './dto/simple-institution-type.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Institution Types')
export class InstitutionTypeController {
  constructor(
    private readonly institutionTypeService: InstitutionTypeService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all institution types. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only institution types from a specific source. Defaults to all.',
  })
  @ApiOkResponse({ type: [InstitutionTypeDto] })
  @ApiOperation({
    summary:
      'Get all institution types, with their direct ancestors, optionally filtered by status and source',
  })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.institutionTypeService.findAll(show, type);
  }

  @Get('/simple')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all institution types. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only institution types from a specific source. Defaults to all.',
  })
  @ApiOkResponse({ type: [SimpleInstitutionTypeDto] })
  @ApiOperation({
    summary:
      'Get all institution types with flattened data, optionally filtered by status and source',
  })
  async findAllSimple(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.institutionTypeService.findAllSimple(show, type);
  }

  @Get('/from-parent')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all institution types. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only institution types from a specific source. Defaults to all.',
  })
  @ApiOkResponse({ type: [InstitutionTypeFromParentDto] })
  @ApiOperation({
    summary:
      'Get all institution types, on a tree-like structure, from parent to children, optionally filtered by status and source',
  })
  async findAllFromParentToChildren(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.institutionTypeService.findAllFromParentToChildren(
      show,
      type,
    );
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the institution type',
  })
  @ApiOkResponse({ type: [InstitutionTypeDto] })
  @ApiOperation({
    summary: 'Get an institution type by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionTypeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateInstitutionTypeDtoList: UpdateInstitutionTypeDto[],
  ) {
    try {
      const result: InstitutionType[] =
        await this.institutionTypeService.update(updateInstitutionTypeDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

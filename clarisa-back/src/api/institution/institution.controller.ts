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
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InstitutionDto } from './dto/institution.dto';
import { InstitutionSimpleDto } from './dto/institution-simple.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Institutions')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all institutions. Defaults to active.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description:
      'Show institutions from a certain date (in milis). Defaults to null (shows all institutions).',
  })
  @ApiOkResponse({ type: [InstitutionDto] })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('from') from: string = undefined,
  ) {
    return await this.institutionService.findAll(show, from);
  }

  @Get('simple')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all institutions. Defaults to active.',
  })
  @ApiOkResponse({ type: [InstitutionSimpleDto] })
  async findAllSimple(@Query('show') show: FindAllOptions) {
    return await this.institutionService.findAllSimple(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the institution',
  })
  @ApiOkResponse({ type: [InstitutionDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionService.findOne(id);
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

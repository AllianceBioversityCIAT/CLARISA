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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InstitutionService } from './institution.service';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { Response } from 'express';
import { Institution } from './entities/institution.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Institution')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  @ApiOperation({
    summary: 'List institutions',
    description:
      'Official list of institutions registered in CLARISA, including their type, acronym, country offices and headquarters.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Optional incremental cursor: only institutions with an ID greater than this value.',
  })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('from', new ParseIntPipe({ optional: true }))
    from?: number,
  ) {
    return await this.institutionService.findAll(show, from);
  }

  @Get('simple')
  async findAllSimple(@Query('show') show: FindAllOptions) {
    return await this.institutionService.findAllSimple(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionService.findOne(id);
  }

  @Get('simple/:id')
  async findOneSimple(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionService.findOneSimple(id);
  }

  @Patch('update')
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

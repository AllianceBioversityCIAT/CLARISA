import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GeneralAcronymService } from './general-acronym.service';
import { UpdateGeneralAcronymDto } from './dto/update-general-acronym.dto';
import { Response } from 'express';
import { GeneralAcronym } from './entities/general-acronym.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('CGIAR Acronyms')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GeneralAcronymController {
  constructor(private readonly generalAcronymService: GeneralAcronymService) {}

  @Get()
  @ApiOperation({
    summary: 'List CGIAR acronyms',
    description:
      'General list of acronyms used across the CGIAR and their descriptions.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.generalAcronymService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.generalAcronymService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateGeneralAcronymDtoList: UpdateGeneralAcronymDto[],
  ) {
    try {
      const result: GeneralAcronym[] = await this.generalAcronymService.update(
        updateGeneralAcronymDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

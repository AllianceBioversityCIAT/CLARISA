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
import { TechnicalFieldService } from './technical-field.service';
import { UpdateTechnicalFieldDto } from './dto/update-technical-field.dto';
import { Response } from 'express';
import { TechnicalField } from './entities/technical-field.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Technical Field')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class TechnicalFieldController {
  constructor(private readonly technicalFieldService: TechnicalFieldService) {}

  @Get()
  @ApiOperation({
    summary: 'List technical fields',
    description: 'Technical fields used to classify innovations in the catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.technicalFieldService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.technicalFieldService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateTechnicalFieldDtoList: UpdateTechnicalFieldDto[],
  ) {
    try {
      const result: TechnicalField[] = await this.technicalFieldService.update(
        updateTechnicalFieldDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

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
import { TechnicalFieldService } from './technical-field.service';
import { UpdateTechnicalFieldDto } from './dto/update-technical-field.dto';
import { Response } from 'express';
import { TechnicalField } from './entities/technical-field.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Technical Fields')
export class TechnicalFieldController {
  constructor(private readonly technicalFieldService: TechnicalFieldService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all technical fields. Defaults to active.',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.technicalFieldService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the technical field',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.technicalFieldService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

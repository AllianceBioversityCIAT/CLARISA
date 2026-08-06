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
import { ImpactAreaService } from './impact-area.service';
import { UpdateImpactAreaDto } from './dto/update-impact-area.dto';
import { Response } from 'express';
import { ImpactArea } from './entities/impact-area.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Impact Area')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ImpactAreaController {
  constructor(private readonly impactAreaService: ImpactAreaService) {}

  @Get()
  @ApiOperation({
    summary: 'List impact areas',
    description:
      'The five One CGIAR impact areas (Nutrition, Poverty, Gender, Climate, Environment) defined in the Research Strategy 2030.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.impactAreaService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.impactAreaService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateImpactAreaDtoList: UpdateImpactAreaDto[],
  ) {
    try {
      const result: ImpactArea[] = await this.impactAreaService.update(
        updateImpactAreaDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

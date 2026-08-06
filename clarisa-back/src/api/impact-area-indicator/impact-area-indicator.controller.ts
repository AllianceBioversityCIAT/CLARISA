import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  Res,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ImpactAreaIndicatorService } from './impact-area-indicator.service';
import { UpdateImpactAreaIndicatorDto } from './dto/update-impact-area-indicator.dto';
import { ImpactAreaIndicator } from './entities/impact-area-indicator.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Impact Area Indicator')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ImpactAreaIndicatorController {
  constructor(
    private readonly impactAreaIndicatorService: ImpactAreaIndicatorService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List impact area indicators',
    description:
      'Indicators that measure progress against the One CGIAR impact areas.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiQuery({ name: 'version', required: false, description: 'Optional indicator framework version.' })
  @ApiQuery({ name: 'portfolio', required: false, description: 'Optional portfolio filter.' })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('version') version: string,
    @Query('portfolio') portfolio: string,
  ) {
    return await this.impactAreaIndicatorService.findAll(
      show,
      +version,
      +portfolio,
    );
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.impactAreaIndicatorService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateImpactAreaIndicator: UpdateImpactAreaIndicatorDto[],
  ) {
    try {
      const result: ImpactAreaIndicator[] =
        await this.impactAreaIndicatorService.update(updateImpactAreaIndicator);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

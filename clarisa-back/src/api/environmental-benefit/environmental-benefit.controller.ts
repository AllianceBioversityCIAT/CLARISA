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
import { EnvironmentalBenefitService } from './environmental-benefit.service';
import { UpdateEnvironmentalBenefitDto } from './dto/update-environmental-benefit.dto';
import { Response } from 'express';
import { EnvironmentalBenefit } from './entities/environmental-benefit.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Environmental Benefit')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class EnvironmentalBenefitController {
  constructor(
    private readonly environmentalBenefitService: EnvironmentalBenefitService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List environmental benefits',
    description: 'Environmental benefits associated with innovations in the catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.environmentalBenefitService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.environmentalBenefitService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateEnvironmentalBenefitDtoList: UpdateEnvironmentalBenefitDto[],
  ) {
    try {
      const result: EnvironmentalBenefit[] =
        await this.environmentalBenefitService.update(
          updateEnvironmentalBenefitDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

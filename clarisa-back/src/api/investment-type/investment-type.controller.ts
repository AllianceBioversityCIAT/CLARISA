import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InvestmentTypeService } from './investment-type.service';
import { UpdateInvestmentTypeDto } from './dto/update-investment-type.dto';
import { Response } from 'express';
import { InvestmentType } from './entities/investment-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Investment Type')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class InvestmentTypeController {
  constructor(private readonly investmentTypeService: InvestmentTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List investment types',
    description: 'Types of investment associated with innovations in the catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.investmentTypeService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.investmentTypeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateInvestmentTypeDtoList: UpdateInvestmentTypeDto[],
  ) {
    try {
      const result: InvestmentType[] = await this.investmentTypeService.update(
        updateInvestmentTypeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

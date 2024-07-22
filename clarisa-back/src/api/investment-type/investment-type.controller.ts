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
import { InvestmentTypeService } from './investment-type.service';
import { UpdateInvestmentTypeDto } from './dto/update-investment-type.dto';
import { Response } from 'express';
import { InvestmentType } from './entities/investment-type.entity';
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
@ApiTags('Investment Types')
export class InvestmentTypeController {
  constructor(private readonly investmentTypeService: InvestmentTypeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all investment types. Defaults to active.',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.investmentTypeService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the beneficiary',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.investmentTypeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PortfolioDto } from './dto/portfolio.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all portfolios. Defaults to active.',
  })
  @ApiOkResponse({ type: [PortfolioDto] })
  findAll(@Query('show') show: FindAllOptions) {
    return this.portfolioService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the portfolio',
  })
  @ApiOkResponse({ type: [PortfolioDto] })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.portfolioService.findOne(+id);
  }
}

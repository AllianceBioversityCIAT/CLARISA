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
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Get all portfolios, optionally filtered by status',
  })
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
  @ApiOperation({
    summary: 'Get a portfolio by id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.portfolioService.findOne(id);
  }
}

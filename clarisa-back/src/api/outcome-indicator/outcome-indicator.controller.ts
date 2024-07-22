import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { OutcomeIndicatorService } from './outcome-indicator.service';
import { UpdateOutcomeIndicatorDto } from './dto/update-outcome-indicator.dto';
import { OutcomeIndicator } from './entities/outcome-indicator.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OutcomeIndicatorDto } from './dto/outcome-indicator.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Outcome Indicators')
export class OutcomeIndicatorController {
  constructor(
    private readonly outcomeIndicatorService: OutcomeIndicatorService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all outcome indicators. Defaults to active.',
  })
  @ApiOkResponse({ type: [OutcomeIndicatorDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.outcomeIndicatorService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the outcome indicator',
  })
  @ApiOkResponse({ type: [OutcomeIndicatorDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.outcomeIndicatorService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateOutcomeIndicatorDtoList: UpdateOutcomeIndicatorDto[],
  ) {
    try {
      const result: OutcomeIndicator[] =
        await this.outcomeIndicatorService.update(
          updateOutcomeIndicatorDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

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
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';
import { UpdateActionAreaOutcomeIndicatorDto } from './dto/update-action-area-outcome-indicator.dto';
import { ActionAreaOutcomeIndicator } from './entities/action-area-outcome-indicator.entity';

@ApiTags('Action Area Outcome Indicator')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ActionAreaOutcomeIndicatorController {
  constructor(
    private readonly actionAreaOutcomeIndicatorService: ActionAreaOutcomeIndicatorService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List action area outcome indicators',
    description: 'Indicators that measure the action area outcomes.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeIndicatorService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaOutcomeIndicatorService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body()
    updateActionAreaOutcomeIndicatorDtoList: UpdateActionAreaOutcomeIndicatorDto[],
  ) {
    try {
      const result: ActionAreaOutcomeIndicator[] =
        await this.actionAreaOutcomeIndicatorService.update(
          updateActionAreaOutcomeIndicatorDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

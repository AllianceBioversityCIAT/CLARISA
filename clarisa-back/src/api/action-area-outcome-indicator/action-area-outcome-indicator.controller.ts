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
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';
import { UpdateActionAreaOutcomeIndicatorDto } from './dto/update-action-area-outcome-indicator.dto';
import { ActionAreaOutcomeIndicator } from './entities/action-area-outcome-indicator.entity';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ActionAreaOutcomeIndicatorDto } from './dto/action-area-outcome-indicator.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Action Area Outcome Indicators')
export class ActionAreaOutcomeIndicatorController {
  constructor(
    private readonly actionAreaOutcomeIndicatorService: ActionAreaOutcomeIndicatorService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all action area outcome indicators. Defaults to active',
  })
  @ApiOkResponse({ type: [ActionAreaOutcomeIndicatorDto] })
  @ApiOperation({
    summary:
      'Get all action area outcome indicators, optionally filtered by status',
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeIndicatorService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the action area outcome indicator',
  })
  @ApiOkResponse({ type: ActionAreaOutcomeIndicator })
  @ApiOperation({
    summary: 'Get an action area outcome indicator by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaOutcomeIndicatorService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

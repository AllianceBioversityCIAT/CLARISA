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
import { ActionAreaOutcomeService } from './action-area-outcome.service';
import { UpdateActionAreaOutcomeDto } from './dto/update-action-area-outcome.dto';
import { ActionAreaOutcome } from './entities/action-area-outcome.entity';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ActionAreaOutcomeDto } from './dto/action-area-outcome.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Action Area Outcomes')
export class ActionAreaOutcomeController {
  constructor(
    private readonly actionAreaOutcomeService: ActionAreaOutcomeService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all action area outcomes. Defaults to active',
  })
  @ApiOkResponse({ type: [ActionAreaOutcomeDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the action area outcome',
  })
  @ApiOkResponse({ type: ActionAreaOutcome })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaOutcomeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateActionAreaOutcomeDtoList: UpdateActionAreaOutcomeDto[],
  ) {
    try {
      const result: ActionAreaOutcome[] =
        await this.actionAreaOutcomeService.update(
          updateActionAreaOutcomeDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

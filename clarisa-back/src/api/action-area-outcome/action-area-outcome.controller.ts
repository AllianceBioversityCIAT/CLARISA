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
import { ActionAreaOutcomeService } from './action-area-outcome.service';
import { UpdateActionAreaOutcomeDto } from './dto/update-action-area-outcome.dto';
import { ActionAreaOutcome } from './entities/action-area-outcome.entity';

@ApiTags('Action Area Outcome')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ActionAreaOutcomeController {
  constructor(
    private readonly actionAreaOutcomeService: ActionAreaOutcomeService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List action area outcomes',
    description: 'Outcomes associated with the One CGIAR action areas.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaOutcomeService.findOne(id);
  }

  @Patch('update')
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

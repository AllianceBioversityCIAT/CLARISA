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

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class OutcomeIndicatorController {
  constructor(
    private readonly outcomeIndicatorService: OutcomeIndicatorService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.outcomeIndicatorService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.outcomeIndicatorService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateOutcomeIndicatorDtoList: UpdateOutcomeIndicatorDto[],
  ) {
    try {
      const result: OutcomeIndicator[] =
        await this.outcomeIndicatorService.update(
          updateOutcomeIndicatorDtoList,
        );
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

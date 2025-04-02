import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  Res,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ImpactAreaIndicatorService } from './impact-area-indicator.service';
import { UpdateImpactAreaIndicatorDto } from './dto/update-impact-area-indicator.dto';
import { ImpactAreaIndicator } from './entities/impact-area-indicator.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ImpactAreaIndicatorController {
  constructor(
    private readonly impactAreaIndicatorService: ImpactAreaIndicatorService,
  ) {}

  @Get()
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('version') version: string,
    @Query('portfolio') portfolio: string,
  ) {
    return await this.impactAreaIndicatorService.findAll(
      show,
      +version,
      +portfolio,
    );
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.impactAreaIndicatorService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateImpactAreaIndicator: UpdateImpactAreaIndicatorDto[],
  ) {
    try {
      const result: ImpactAreaIndicator[] =
        await this.impactAreaIndicatorService.update(updateImpactAreaIndicator);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { RegionTypeService } from './region-type.service';
import { UpdateRegionTypeDto } from './dto/update-region-type.dto';
import { Response } from 'express';
import { RegionType } from './entities/region-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class RegionTypeController {
  constructor(private readonly regionTypeService: RegionTypeService) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.regionTypeService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.regionTypeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateRegionTypeDtoList: UpdateRegionTypeDto[],
  ) {
    try {
      const result: RegionType[] = await this.regionTypeService.update(
        updateRegionTypeDtoList,
      );
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

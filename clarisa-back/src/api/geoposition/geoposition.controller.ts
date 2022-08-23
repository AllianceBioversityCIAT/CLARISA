import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, Res, HttpStatus, HttpException, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { GeopositionService } from './geoposition.service';
import { CreateGeopositionDto } from './dto/create-geoposition.dto';
import { UpdateGeopositionDto } from './dto/update-geoposition.dto';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { Response } from 'express';
import { Geoposition } from './entities/geoposition.entity';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GeopositionController {
  constructor(private readonly geopositionService: GeopositionService) {}

  @Get()
  async findAll(@Query('show') show : FindAllOptions) {
    return await this.geopositionService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.geopositionService.findOne(id);
  }

  @Patch('update')
  async update(@Res() res: Response, @Body() updateGeopositionDtoList: UpdateGeopositionDto[]) {
    try {
      const result : Geoposition[] = await this.geopositionService.update(updateGeopositionDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
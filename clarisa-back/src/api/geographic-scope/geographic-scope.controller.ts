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
import { GeographicScopeService } from './geographic-scope.service';
import { UpdateGeographicScopeDto } from './dto/update-geographic-scope.dto';
import { Response } from 'express';
import { GeographicScope } from './entities/geographic-scope.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GeographicScopeController {
  constructor(
    private readonly geographicScopeService: GeographicScopeService,
  ) {}

  @Get()
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.geographicScopeService.findAll(show, type);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.geographicScopeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateGeographicScopeDtoList: UpdateGeographicScopeDto[],
  ) {
    try {
      const result: GeographicScope[] =
        await this.geographicScopeService.update(updateGeographicScopeDtoList);
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

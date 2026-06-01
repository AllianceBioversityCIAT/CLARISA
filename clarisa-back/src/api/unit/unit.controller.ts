import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UnitService } from './unit.service';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Response } from 'express';
import { Unit } from './entities/unit.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Unit')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  @ApiOperation({
    summary: 'List units',
    description: 'Organizational units used across One CGIAR operations.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.unitService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.unitService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateUnitDto[],
  ) {
    try {
      const result: Unit[] = await this.unitService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

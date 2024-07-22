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
import { UnitService } from './unit.service';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Response } from 'express';
import { Unit } from './entities/unit.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UnitDto } from './dto/unit.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all units. Defaults to active.',
  })
  @ApiOkResponse({ type: [UnitDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.unitService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the unit',
  })
  @ApiOkResponse({ type: [UnitDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.unitService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

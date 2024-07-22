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
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Region Types')
export class RegionTypeController {
  constructor(private readonly regionTypeService: RegionTypeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all region types. Defaults to active.',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.regionTypeService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the region type',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.regionTypeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateRegionTypeDtoList: UpdateRegionTypeDto[],
  ) {
    try {
      const result: RegionType[] = await this.regionTypeService.update(
        updateRegionTypeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

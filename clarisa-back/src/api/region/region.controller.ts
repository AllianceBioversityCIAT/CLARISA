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
import { RegionService } from './region.service';
import { UpdateRegionDto } from './dto/update-region.dto';
import { Response } from 'express';
import { Region } from './entities/region.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../shared/entities/enums/region-types';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RegionDto } from './dto/region.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Regions')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get('un-regions')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all regions. Defaults to active.',
  })
  @ApiOkResponse({ type: [RegionDto] })
  async findAllUNRegions(@Query('show') show: FindAllOptions) {
    return await this.regionService.findAll(RegionTypeEnum.UN_REGION, show);
  }

  @Get('one-cgiar-regions')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all regions. Defaults to active.',
  })
  @ApiOkResponse({ type: [RegionDto] })
  async findAllCGIARRegions(@Query('show') show: FindAllOptions) {
    return await this.regionService.findAll(RegionTypeEnum.CGIAR_REGION, show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the region',
  })
  @ApiOkResponse({ type: [RegionDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.regionService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateRegionDtoList: UpdateRegionDto[],
  ) {
    try {
      const result: Region[] =
        await this.regionService.update(updateRegionDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

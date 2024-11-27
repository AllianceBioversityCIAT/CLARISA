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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UnRegionDto } from './dto/un-region.dto';
import { CgiarRegionDto } from './dto/cgiar-region.dto';

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
  @ApiOkResponse({ type: [UnRegionDto] })
  @ApiOperation({
    summary: 'Get all UN regions, optionally filtered by status',
  })
  async findAllUNRegions(@Query('show') show: FindAllOptions) {
    return this.regionService.findRegions(
      RegionTypeEnum.UN_REGION,
      show,
    ) as Promise<UnRegionDto[]>;
  }

  @Get('one-cgiar-regions')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all regions. Defaults to active.',
  })
  @ApiOkResponse({ type: [CgiarRegionDto] })
  @ApiOperation({
    summary: 'Get all One CGIAR regions, optionally filtered by status',
  })
  async findAllCGIARRegions(@Query('show') show: FindAllOptions) {
    return this.regionService.findRegions(
      RegionTypeEnum.CGIAR_REGION,
      show,
    ) as Promise<CgiarRegionDto[]>;
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the region',
  })
  @ApiQuery({
    name: 'type',
    enum: RegionTypeEnum.getAsEnumLikeObject(),
    required: true,
    description: 'The type of the region',
  })
  @ApiOkResponse({ type: CgiarRegionDto })
  @ApiOperation({
    summary: 'Get a region by id and type',
  })
  async findOneByIdAndType(
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type: string,
  ) {
    return this.regionService.findRegionByIdAndType(
      id,
      type,
    ) as Promise<CgiarRegionDto>;
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

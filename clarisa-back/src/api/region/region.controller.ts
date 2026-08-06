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
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RegionService } from './region.service';
import { RegionDto } from './dto/region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { Response } from 'express';
import { Region } from './entities/region.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../shared/entities/enums/region-types';

@ApiTags('Region')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get('un-regions')
  @ApiOperation({
    summary: 'List UN regions',
    description:
      'Returns all regions based on the United Nations (UN) M49 standard, including their parent region and member countries.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiOkResponse({ type: RegionDto, isArray: true, description: 'List of UN regions.' })
  async findAllUNRegions(@Query('show') show: FindAllOptions) {
    return await this.regionService.findAll(RegionTypeEnum.UN_REGION, show);
  }

  @Get('one-cgiar-regions')
  @ApiOperation({
    summary: 'List One CGIAR regions',
    description:
      'Returns the regions One CGIAR concentrates its efforts on, as stated in the One CGIAR Strategy (e.g. Latin America and the Caribbean, South Asia, West and Central Africa).',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiOkResponse({ type: RegionDto, isArray: true, description: 'List of One CGIAR regions.' })
  async findAllCGIARRegions(@Query('show') show: FindAllOptions) {
    return await this.regionService.findAll(RegionTypeEnum.CGIAR_REGION, show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.regionService.findOne(id);
  }

  @Patch('update')
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

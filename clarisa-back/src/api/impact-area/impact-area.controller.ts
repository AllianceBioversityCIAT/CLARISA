import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ImpactAreaService } from './impact-area.service';
import { UpdateImpactAreaDto } from './dto/update-impact-area.dto';
import { Response } from 'express';
import { ImpactArea } from './entities/impact-area.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ImpactAreaDto } from './dto/impact-area.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Impact Areas')
export class ImpactAreaController {
  constructor(private readonly impactAreaService: ImpactAreaService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all impact areas. Defaults to active.',
  })
  @ApiOkResponse({ type: [ImpactAreaDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.impactAreaService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the impact area',
  })
  @ApiOkResponse({ type: [ImpactAreaDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.impactAreaService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateImpactAreaDtoList: UpdateImpactAreaDto[],
  ) {
    try {
      const result: ImpactArea[] = await this.impactAreaService.update(
        updateImpactAreaDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

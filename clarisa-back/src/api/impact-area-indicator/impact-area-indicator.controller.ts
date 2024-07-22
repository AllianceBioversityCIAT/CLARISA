import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  Res,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ImpactAreaIndicatorService } from './impact-area-indicator.service';
import { UpdateImpactAreaIndicatorDto } from './dto/update-impact-area-indicator.dto';
import { ImpactAreaIndicator } from './entities/impact-area-indicator.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ImpactAreaIndicatorDto } from './dto/impact-area-indicator.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Impact Area Indicators')
export class ImpactAreaIndicatorController {
  constructor(
    private readonly impactAreaIndicatorService: ImpactAreaIndicatorService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all impact area indicators. Defaults to active.',
  })
  @ApiOkResponse({ type: [ImpactAreaIndicatorDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.impactAreaIndicatorService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the impact area indicator',
  })
  @ApiOkResponse({ type: [ImpactAreaIndicatorDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.impactAreaIndicatorService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateImpactAreaIndicator: UpdateImpactAreaIndicatorDto[],
  ) {
    try {
      const result: ImpactAreaIndicator[] =
        await this.impactAreaIndicatorService.update(updateImpactAreaIndicator);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

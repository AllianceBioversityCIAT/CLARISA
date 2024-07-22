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
import { EnvironmentalBenefitService } from './environmental-benefit.service';
import { UpdateEnvironmentalBenefitDto } from './dto/update-environmental-benefit.dto';
import { Response } from 'express';
import { EnvironmentalBenefit } from './entities/environmental-benefit.entity';
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
@ApiTags('Environmental Benefits')
export class EnvironmentalBenefitController {
  constructor(
    private readonly environmentalBenefitService: EnvironmentalBenefitService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all environmental benefits. Defaults to active.',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.environmentalBenefitService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the environmental benefit',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.environmentalBenefitService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateEnvironmentalBenefitDtoList: UpdateEnvironmentalBenefitDto[],
  ) {
    try {
      const result: EnvironmentalBenefit[] =
        await this.environmentalBenefitService.update(
          updateEnvironmentalBenefitDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Res,
  Query,
} from '@nestjs/common';
import { ProjectedBenefitWeightingService } from './projected-benefit-weighting.service';
import { UpdateProjectedBenefitWeightingDto } from './dto/update-projected-benefit-weighting.dto';
import { Response } from 'express';
import { ProjectedBenefitWeighting } from './entities/projected-benefit-weighting.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectedBenefitWeightingDtoV2 } from './dto/projected-benefit-weighting.v2.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Projected Benefit Weightings')
export class ProjectedBenefitWeightingController {
  constructor(
    private readonly projectedBenefitWeightingService: ProjectedBenefitWeightingService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all projected benefit weightings. Defaults to active.',
  })
  @ApiOkResponse({ type: [ProjectedBenefitWeightingDtoV2] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.projectedBenefitWeightingService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the projected benefit weighting',
  })
  @ApiOkResponse({ type: [ProjectedBenefitWeightingDtoV2] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.projectedBenefitWeightingService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body()
    updateProjectedBenefitWeightingDtoList: UpdateProjectedBenefitWeightingDto[],
  ) {
    try {
      const result: ProjectedBenefitWeighting[] =
        await this.projectedBenefitWeightingService.update(
          updateProjectedBenefitWeightingDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

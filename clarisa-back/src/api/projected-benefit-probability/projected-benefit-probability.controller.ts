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
import { ProjectedBenefitProbabilityService } from './projected-benefit-probability.service';
import { UpdateProjectedBenefitProbabilityDto } from './dto/update-projected-benefit-probability.dto';
import { Response } from 'express';
import { ProjectedBenefitProbability } from './entities/projected-benefit-probability.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectedBenefitProbabilityDto } from './dto/projected-benefit-probability.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Projected Benefit Probabilities')
export class ProjectedBenefitProbabilityController {
  constructor(
    private readonly projectedBenefitProbabilityService: ProjectedBenefitProbabilityService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all projected benefit probabilities. Defaults to active.',
  })
  @ApiOkResponse({ type: [ProjectedBenefitProbabilityDto] })
  findAll(@Query('show') show: FindAllOptions) {
    return this.projectedBenefitProbabilityService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the projected benefit probability',
  })
  @ApiOkResponse({ type: [ProjectedBenefitProbabilityDto] })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectedBenefitProbabilityService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body()
    updateProjectedBenefitProbabilityDtoList: UpdateProjectedBenefitProbabilityDto[],
  ) {
    try {
      const result: ProjectedBenefitProbability[] =
        await this.projectedBenefitProbabilityService.update(
          updateProjectedBenefitProbabilityDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

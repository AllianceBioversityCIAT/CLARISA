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
import { ProjectedBenefitWeightDescriptionService } from './projected-benefit-weight-description.service';
import { UpdateProjectedBenefitWeightDescriptionDto } from './dto/update-projected-benefit-weight-description.dto';
import { ProjectedBenefitWeightDescription } from './entities/projected-benefit-weight-description.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectedBenefitWeightDescriptionDto } from './dto/projected-benefit-weight-description.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Projected Benefit Weight Descriptions')
export class ProjectedBenefitWeightDescriptionController {
  constructor(
    private readonly projectedBenefitWeightDescriptionService: ProjectedBenefitWeightDescriptionService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all projected benefit weight descriptions. Defaults to active.',
  })
  @ApiOkResponse({ type: [ProjectedBenefitWeightDescriptionDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.projectedBenefitWeightDescriptionService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the projected benefit weight description',
  })
  @ApiOkResponse({ type: [ProjectedBenefitWeightDescriptionDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.projectedBenefitWeightDescriptionService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body()
    updateProjectedBenefitWeightDescriptionDto: UpdateProjectedBenefitWeightDescriptionDto[],
  ) {
    try {
      const result: ProjectedBenefitWeightDescription[] =
        await this.projectedBenefitWeightDescriptionService.update(
          updateProjectedBenefitWeightDescriptionDto,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

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

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectedBenefitWeightingController {
  constructor(
    private readonly projectedBenefitWeightingService: ProjectedBenefitWeightingService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.projectedBenefitWeightingService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.projectedBenefitWeightingService.findOne(id);
  }

  @Patch('update')
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
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

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

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectedBenefitWeightDescriptionController {
  constructor(
    private readonly projectedBenefitWeightDescriptionService: ProjectedBenefitWeightDescriptionService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.projectedBenefitWeightDescriptionService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.projectedBenefitWeightDescriptionService.findOne(id);
  }

  @Patch('update')
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
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

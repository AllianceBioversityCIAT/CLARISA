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
import { ProjectedBenefitDepthService } from './projected-benefit-depth.service';
import { UpdateProjectedBenefitDepthDto } from './dto/update-projected-benefit-depth.dto';
import { ProjectedBenefitDepth } from './entities/projected-benefit-depth.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectedBenefitDepthController {
  constructor(
    private readonly projectedBenefitDepthService: ProjectedBenefitDepthService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.projectedBenefitDepthService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.projectedBenefitDepthService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body()
    updateProjectedBenefitDepthDtoList: UpdateProjectedBenefitDepthDto[],
  ) {
    try {
      const result: ProjectedBenefitDepth[] =
        await this.projectedBenefitDepthService.update(
          updateProjectedBenefitDepthDtoList,
        );
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

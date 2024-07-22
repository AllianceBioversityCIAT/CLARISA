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
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectedBenefitDepthDto } from './dto/projected-benefit-depth.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Projected Benefit Depths')
export class ProjectedBenefitDepthController {
  constructor(
    private readonly projectedBenefitDepthService: ProjectedBenefitDepthService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all projected benefit depths. Defaults to active.',
  })
  @ApiOkResponse({ type: [ProjectedBenefitDepthDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.projectedBenefitDepthService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the projected benefit depth',
  })
  @ApiOkResponse({ type: [ProjectedBenefitDepthDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.projectedBenefitDepthService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

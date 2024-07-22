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
import { ProjectedBenefitService } from './projected-benefit.service';
import { UpdateProjectedBenefitDto } from './dto/update-projected-benefit.dto';
import { Response } from 'express';
import { ProjectedBenefit } from './entities/projected-benefit.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectedBenefitDto } from './dto/projected-benefit.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Projected Benefits')
export class ProjectedBenefitController {
  constructor(
    private readonly projectedBenefitService: ProjectedBenefitService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all projected benefits. Defaults to active.',
  })
  @ApiOkResponse({ type: [ProjectedBenefitDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.projectedBenefitService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the projected benefit',
  })
  @ApiOkResponse({ type: [ProjectedBenefitDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.projectedBenefitService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateProjectedBenefitDtoList: UpdateProjectedBenefitDto[],
  ) {
    try {
      const result: ProjectedBenefit[] =
        await this.projectedBenefitService.update(
          updateProjectedBenefitDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

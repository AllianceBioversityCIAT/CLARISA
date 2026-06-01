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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TechnologyDevelopmentStageService } from './technology-development-stage.service';
import { UpdateTechnologyDevelopmentStageDto } from './dto/update-technology-development-stage.dto';
import { Response } from 'express';
import { TechnologyDevelopmentStage } from './entities/technology-development-stage.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Technology Development Stage')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class TechnologyDevelopmentStageController {
  constructor(
    private readonly technologyDevelopmentStageService: TechnologyDevelopmentStageService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List technology development stages',
    description: 'Stages of technology development used to classify innovations.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.technologyDevelopmentStageService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.technologyDevelopmentStageService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body()
    updateTechnologyDevelopmentStageDtoList: UpdateTechnologyDevelopmentStageDto[],
  ) {
    try {
      const result: TechnologyDevelopmentStage[] =
        await this.technologyDevelopmentStageService.update(
          updateTechnologyDevelopmentStageDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

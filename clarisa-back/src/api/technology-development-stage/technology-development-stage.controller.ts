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
import { TechnologyDevelopmentStageService } from './technology-development-stage.service';
import { UpdateTechnologyDevelopmentStageDto } from './dto/update-technology-development-stage.dto';
import { Response } from 'express';
import { TechnologyDevelopmentStage } from './entities/technology-development-stage.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TechnologyDevelopmentStageDto } from './dto/technology-development-stage.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Technology Development Stages')
export class TechnologyDevelopmentStageController {
  constructor(
    private readonly technologyDevelopmentStageService: TechnologyDevelopmentStageService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all technology development stages. Defaults to active.',
  })
  @ApiOkResponse({ type: [TechnologyDevelopmentStageDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.technologyDevelopmentStageService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the technology development stage',
  })
  @ApiOkResponse({ type: [TechnologyDevelopmentStageDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.technologyDevelopmentStageService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

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
import { InnovationReadinessLevelService } from './innovation-readiness-level.service';
import { UpdateInnovationReadinessLevelDto } from './dto/update-innovation-readiness-level.dto';
import { Response } from 'express';
import { InnovationReadinessLevel } from './entities/innovation-readiness-level.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { InnovationReadinessLevelDto } from './dto/innovation-readiness-level.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Innovation Readiness Levels')
export class InnovationReadinessLevelController {
  constructor(
    private readonly innovationReadinessLevelService: InnovationReadinessLevelService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all innovation readiness levels. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only innovation readiness levels from a specific source. Defaults to all.',
  })
  @ApiOkResponse({ type: [InnovationReadinessLevelDto] })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.innovationReadinessLevelService.findAll(show, type);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the innovation readiness level',
  })
  @ApiOkResponse({ type: [InnovationReadinessLevelDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.innovationReadinessLevelService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body()
    updateInnovationReadinessLevelDtoList: UpdateInnovationReadinessLevelDto[],
  ) {
    try {
      const result: InnovationReadinessLevel[] =
        await this.innovationReadinessLevelService.update(
          updateInnovationReadinessLevelDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

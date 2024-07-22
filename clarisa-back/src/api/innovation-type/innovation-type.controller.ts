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
import { InnovationTypeService } from './innovation-type.service';
import { UpdateInnovationTypeDto } from './dto/update-innovation-type.dto';
import { Response } from 'express';
import { InnovationType } from './entities/innovation-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { InnovationTypeDto } from './dto/innovation-type.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Innovation Types')
export class InnovationTypeController {
  constructor(private readonly innovationTypeService: InnovationTypeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all innovation types. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only innovation types from a specific source. Defaults to all.',
  })
  @ApiOkResponse({ type: [InnovationTypeDto] })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.innovationTypeService.findAll(show, type);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the innovation type',
  })
  @ApiOkResponse({ type: [InnovationTypeDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.innovationTypeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateInnovationTypeDtoList: UpdateInnovationTypeDto[],
  ) {
    try {
      const result: InnovationType[] = await this.innovationTypeService.update(
        updateInnovationTypeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

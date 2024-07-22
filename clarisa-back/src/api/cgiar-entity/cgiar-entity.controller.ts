import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Version,
} from '@nestjs/common';
import { CgiarEntityService } from './cgiar-entity.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CgiarEntityDtoV1 } from './dto/cgiar-entity.v1.dto';
import { CgiarEntityDtoV2 } from './dto/cgiar-entity.v2.dto';
import { CgiarEntityTypeOption } from '../../shared/entities/enums/cgiar-entity-types';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('CGIAR Entities')
export class CgiarEntityController {
  constructor(private readonly cgiarEntityService: CgiarEntityService) {}

  @Version('1')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all CGIAR entities. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: CgiarEntityTypeOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show CGIAR entities of a specific type. Defaults to all types.',
  })
  @ApiOkResponse({ type: [CgiarEntityDtoV1] })
  async findAllV1(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.cgiarEntityService.findAllV1(show, type);
  }

  @Version('1')
  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the CGIAR entity',
  })
  @ApiOkResponse({ type: [CgiarEntityDtoV1] })
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityService.findOneV1(id);
  }

  @Version('2')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all CGIAR entities. Defaults to active.',
  })
  @ApiOkResponse({ type: [CgiarEntityDtoV2] })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityService.findAllV2(show);
  }

  @Version('2')
  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the CGIAR entity',
  })
  @ApiOkResponse({ type: [CgiarEntityDtoV2] })
  async findOneV2(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityService.findOneV2(id);
  }
}

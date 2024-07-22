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
import { CgiarEntityTypeService } from './cgiar-entity-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CgiarEntityTypeDtoV2 } from './dto/cgiar-entity-type.v2.dto';
import { BasicDtoV2 } from '../../shared/entities/dtos/basic.v2.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('CGIAR Entity Types')
export class CgiarEntityTypeController {
  constructor(
    private readonly cgiarEntityTypeService: CgiarEntityTypeService,
  ) {}

  @Version('1')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all CGIAR entity types. Defaults to active.',
  })
  @ApiOkResponse({ type: [BasicDtoV2] })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityTypeService.findAllV1(show);
  }

  @Version('1')
  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the CGIAR entity type',
  })
  @ApiOkResponse({ type: [BasicDtoV2] })
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityTypeService.findOneV1(id);
  }

  @Version('2')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all CGIAR entity types. Defaults to active.',
  })
  @ApiOkResponse({ type: [CgiarEntityTypeDtoV2] })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityTypeService.findAllV2(show);
  }

  @Version('2')
  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the CGIAR entity type',
  })
  @ApiOkResponse({ type: [CgiarEntityTypeDtoV2] })
  async findOneV2(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityTypeService.findOneV2(id);
  }
}

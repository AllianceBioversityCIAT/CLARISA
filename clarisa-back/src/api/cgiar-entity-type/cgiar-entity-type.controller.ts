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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CgiarEntityTypeService } from './cgiar-entity-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('CGIAR Entity Type')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CgiarEntityTypeController {
  constructor(
    private readonly cgiarEntityTypeService: CgiarEntityTypeService,
  ) {}

  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'List CGIAR entity types',
    description:
      'Returns the entity types of CGIAR Research Programs (CRPs), Platforms (PTFs), Centers, Initiatives and the One CGIAR Platform.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityTypeService.findAllV1(show);
  }

  @Version('1')
  @Get('get/:id')
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityTypeService.findOneV1(id);
  }

  @Version('2')
  @Get()
  @ApiOperation({
    summary: 'List CGIAR entity types',
    description:
      'Returns the entity types of CGIAR Research Programs (CRPs), Platforms (PTFs), Centers, Initiatives and the One CGIAR Platform.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityTypeService.findAllV2(show);
  }

  @Version('2')
  @Get('get/:id')
  async findOneV2(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityTypeService.findOneV2(id);
  }
}

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
import { GeographicScopeService } from './geographic-scope.service';
import { UpdateGeographicScopeDto } from './dto/update-geographic-scope.dto';
import { Response } from 'express';
import { GeographicScope } from './entities/geographic-scope.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { GeographicScopeDto } from './dto/geographic-scope.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Geographic Scopes')
export class GeographicScopeController {
  constructor(
    private readonly geographicScopeService: GeographicScopeService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all geographic scopes. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getOnyGeoscopeRelatedEnumLikeObject(),
    required: false,
    description: 'Show the type of regions to display.',
  })
  @ApiOkResponse({ type: [GeographicScopeDto] })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.geographicScopeService.findAll(show, type);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the geographic scope',
  })
  @ApiOkResponse({ type: [GeographicScopeDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.geographicScopeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateGeographicScopeDtoList: UpdateGeographicScopeDto[],
  ) {
    try {
      const result: GeographicScope[] =
        await this.geographicScopeService.update(updateGeographicScopeDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

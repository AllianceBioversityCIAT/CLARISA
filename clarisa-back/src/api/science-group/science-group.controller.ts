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
import { ScienceGroupService } from './science-group.service';
import { UpdateScienceGroupDto } from './dto/update-science-group.dto';
import { Response } from 'express';
import { ScienceGroup } from './entities/science-group.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Science Group')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ScienceGroupController {
  constructor(private readonly scienceGroupService: ScienceGroupService) {}

  @Get()
  @ApiOperation({
    summary: 'List science groups',
    description: 'One CGIAR science groups.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.scienceGroupService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.scienceGroupService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateScienceGroupDto[],
  ) {
    try {
      const result: ScienceGroup[] =
        await this.scienceGroupService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

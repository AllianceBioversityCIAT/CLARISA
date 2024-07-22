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
import { ScienceGroupService } from './science-group.service';
import { UpdateScienceGroupDto } from './dto/update-science-group.dto';
import { Response } from 'express';
import { ScienceGroup } from './entities/science-group.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ScienceGroupDto } from './dto/science-group.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Science Groups')
export class ScienceGroupController {
  constructor(private readonly scienceGroupService: ScienceGroupService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all science groups. Defaults to active.',
  })
  @ApiOkResponse({ type: [ScienceGroupDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.scienceGroupService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the science group',
  })
  @ApiOkResponse({ type: [ScienceGroupDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.scienceGroupService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

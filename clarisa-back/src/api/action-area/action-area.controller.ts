import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpException,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaService } from './action-area.service';
import { UpdateActionAreaDto } from './dto/update-action-area.dto';
import { ActionArea } from './entities/action-area.entity';

@ApiTags('Action Area')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ActionAreaController {
  constructor(private readonly actionAreaService: ActionAreaService) {}

  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'List action areas',
    description:
      'One CGIAR action areas (Systems Transformation, Resilient Agrifood Systems, Genetic Innovation) from the Research Strategy 2030.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.actionAreaService.findAll(show);
  }

  @Version('1')
  @Get('get/:id')
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateActionAreaDto[],
  ) {
    try {
      const result: ActionArea[] =
        await this.actionAreaService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

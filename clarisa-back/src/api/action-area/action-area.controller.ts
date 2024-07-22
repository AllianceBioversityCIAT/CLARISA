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
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaService } from './action-area.service';
import { UpdateActionAreaDto } from './dto/update-action-area.dto';
import { ActionArea } from './entities/action-area.entity';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ActionAreaDto } from './dto/action-area.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Action Areas')
export class ActionAreaController {
  constructor(private readonly actionAreaService: ActionAreaService) {}

  @Version('1')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all action areas. Defaults to active',
  })
  @ApiOkResponse({ type: [ActionAreaDto] })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.actionAreaService.findAll(show);
  }

  @Version('1')
  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the action area',
  })
  @ApiOkResponse({ type: [ActionAreaDto] })
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

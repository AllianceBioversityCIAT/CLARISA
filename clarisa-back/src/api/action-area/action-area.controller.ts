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

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ActionAreaController {
  constructor(private readonly actionAreaService: ActionAreaService) {}

  @Version('1')
  @Get()
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

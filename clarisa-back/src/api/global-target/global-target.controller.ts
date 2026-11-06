import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Res,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { GlobalTargetService } from './global-target.service';
import { UpdateGlobalTargetDto } from './dto/update-global-target.dto';
import { GlobalTarget } from './entities/global-target.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GlobalTargetController {
  constructor(private readonly globalTargetsService: GlobalTargetService) {}

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this.globalTargetsService.findAll(show);
  }

  @Get('get/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.globalTargetsService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateGlobalTargetDto[],
  ) {
    try {
      const result: GlobalTarget[] =
        await this.globalTargetsService.update(updateUserDtoList);
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

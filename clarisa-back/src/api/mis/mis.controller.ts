import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { MisService } from './mis.service';
import { CreateMisDto } from './dto/create-mis.dto';
import { UpdateMisDto } from './dto/update-mis.dto';
import { Mis } from './entities/mis.entity';
import { Response } from 'express';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class MisController {
  constructor(private readonly misService: MisService) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.misService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.misService.findOne(id);
  }

  @Patch('update')
  async update(@Res() res: Response, @Body() updateMisDtoList: UpdateMisDto[]) {
    try {
      const result: Mis[] = await this.misService.update(updateMisDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

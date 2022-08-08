import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseEnumPipe, Res, HttpStatus, HttpException, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { ActionAreaService } from './action-area.service';
import { CreateActionAreaDto } from './dto/create-action-area.dto';
import { UpdateActionAreaDto } from './dto/update-action-area.dto';
import { ActionArea } from './entities/action-area.entity';

@Controller()
export class ActionAreaController {
  constructor(private readonly actionAreaService: ActionAreaService) {}

  @Get()
  findAll(@Query('show') show : FindAllOptions) {
    return this.actionAreaService.findAll(show);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actionAreaService.findOne(+id);
  }

  @Patch('update')
  async update(@Res() res: Response, @Body() updateUserDtoList: UpdateActionAreaDto[]) {
    try {
      const result : ActionArea[] = await this.actionAreaService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

}
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Version,
} from '@nestjs/common';
import { ActionAreaService } from './action-area.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
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
}

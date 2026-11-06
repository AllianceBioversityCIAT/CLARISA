import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { DepthDescriptionService } from './depth-description.service';
import { UpdateDepthDescriptionDto } from './dto/update-depth-description.dto';
import { DepthDescription } from './entities/depth-description.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class DepthDescriptionController {
  constructor(
    private readonly depthDescriptionService: DepthDescriptionService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.depthDescriptionService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.depthDescriptionService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateDepthDescriptionDtoList: UpdateDepthDescriptionDto[],
  ) {
    try {
      const result: DepthDescription[] =
        await this.depthDescriptionService.update(
          updateDepthDescriptionDtoList,
        );
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

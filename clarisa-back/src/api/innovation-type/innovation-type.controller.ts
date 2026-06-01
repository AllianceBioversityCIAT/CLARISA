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
import { InnovationTypeService } from './innovation-type.service';
import { UpdateInnovationTypeDto } from './dto/update-innovation-type.dto';
import { Response } from 'express';
import { InnovationType } from './entities/innovation-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Innovation Type')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class InnovationTypeController {
  constructor(private readonly innovationTypeService: InnovationTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List innovation types',
    description: 'Types of innovation used in the CGIAR innovation catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiQuery({ name: 'type', required: false, description: 'Optional filter by parent innovation type.' })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.innovationTypeService.findAll(show, type);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.innovationTypeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateInnovationTypeDtoList: UpdateInnovationTypeDto[],
  ) {
    try {
      const result: InnovationType[] = await this.innovationTypeService.update(
        updateInnovationTypeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

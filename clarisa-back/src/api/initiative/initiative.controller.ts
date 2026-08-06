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
import { InitiativeService } from './initiative.service';
import { UpdateInitiativeDto } from './dto/update-initiative.dto';
import { Response } from 'express';
import { Initiative } from './entities/initiative.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Initiative')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class InitiativeController {
  constructor(private readonly initiativeService: InitiativeService) {}

  @Get()
  @ApiOperation({
    summary: 'List initiatives',
    description:
      'One CGIAR Initiatives, the investment vehicles of the Research Strategy 2030.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.initiativeService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.initiativeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateInitiativeDtoList: UpdateInitiativeDto[],
  ) {
    try {
      const result: Initiative[] = await this.initiativeService.update(
        updateInitiativeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

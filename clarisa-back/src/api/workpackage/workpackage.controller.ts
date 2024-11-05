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
import { WorkpackageService } from './workpackage.service';
import { UpdateWorkpackageDto } from './dto/update-workpackage.dto';
import { Response } from 'express';
import { Workpackage } from './entities/workpackage.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { WorkpackageDto } from './dto/workpackage.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Workpackages')
export class WorkpackageController {
  constructor(private readonly workpackageService: WorkpackageService) {}

  @Get()
  @ApiQuery({
    name: 'showWorkpackages',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all workpackages. Defaults to active.',
  })
  @ApiQuery({
    name: 'showInitiatives',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all initiatives. Defaults to active.',
  })
  @ApiOkResponse({ type: [WorkpackageDto] })
  @ApiOperation({
    summary:
      'Get all workpackages, optionally filtered by workpackage status, and initiative status',
  })
  async findAll(
    @Query('showWorkpackages') showWorkpackages: FindAllOptions,
    @Query('showInitiatives') showInitiatives: FindAllOptions,
  ) {
    return await this.workpackageService.findAll(
      showWorkpackages,
      showInitiatives,
    );
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the workpackage',
  })
  @ApiOkResponse({ type: [WorkpackageDto] })
  @ApiOperation({
    summary: 'Get a workpackage by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.workpackageService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateInitiativeDtoList: UpdateWorkpackageDto[],
  ) {
    try {
      const result: Workpackage[] = await this.workpackageService.update(
        updateInitiativeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

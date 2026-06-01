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
import { InstitutionTypeService } from './institution-type.service';
import { UpdateInstitutionTypeDto } from './dto/update-institution-type.dto';
import { Response } from 'express';
import { InstitutionType } from './entities/institution-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Institution Type')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class InstitutionTypeController {
  constructor(
    private readonly institutionTypeService: InstitutionTypeService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List institution types',
    description:
      'Hierarchical list of institution types used to classify the institutions registered in CLARISA.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Optional filter by parent institution type.',
  })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.institutionTypeService.findAll(show, type);
  }

  @Get('/simple')
  async findAllSimple(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.institutionTypeService.findAllSimple(show, type);
  }

  @Get('/from-parent')
  async findAllFromParentToChildren(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.institutionTypeService.findAllFromParentToChildren(
      show,
      type,
    );
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionTypeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateInstitutionTypeDtoList: UpdateInstitutionTypeDto[],
  ) {
    try {
      const result: InstitutionType[] =
        await this.institutionTypeService.update(updateInstitutionTypeDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

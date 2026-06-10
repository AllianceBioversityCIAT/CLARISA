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
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BusinessCategoryService } from './business-category.service';
import { UpdateBusinessCategoryDto } from './dto/update-business-category.dto';
import { BusinessCategory } from './entities/business-category.entity';

@ApiTags('Business Category')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class BusinessCategoryController {
  constructor(
    private readonly businessCategoryService: BusinessCategoryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List business categories',
    description: 'Business categories used to classify innovations in the catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.businessCategoryService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.businessCategoryService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateBusinessCategoryDtoList: UpdateBusinessCategoryDto[],
  ) {
    try {
      const result: BusinessCategory[] =
        await this.businessCategoryService.update(
          updateBusinessCategoryDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

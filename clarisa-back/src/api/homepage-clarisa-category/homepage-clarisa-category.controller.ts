import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { HomepageClarisaCategoryService } from './homepage-clarisa-category.service';
import { UpdateHomepageClarisaCategoryDto } from './dto/update-homepage-clarisa-category.dto';
import { Response } from 'express';
import { HomepageClarisaCategory } from './entities/homepage-clarisa-category.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiExcludeController } from '@nestjs/swagger';

//@ClarisaPageOnly()
//@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class HomepageClarisaCategoryController {
  constructor(
    private readonly homepageClarisaCategoryService: HomepageClarisaCategoryService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.homepageClarisaCategoryService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.homepageClarisaCategoryService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body()
    updateHomepageClarisaCategoryDtoList: UpdateHomepageClarisaCategoryDto[],
  ) {
    try {
      const result: HomepageClarisaCategory[] =
        await this.homepageClarisaCategoryService.update(
          updateHomepageClarisaCategoryDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

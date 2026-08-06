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
  HttpStatus,
  HttpException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OneCgiarUserService } from './one-cgiar-user.service';
import { UpdateOneCgiarUserDto } from './dto/update-one-cgiar-user.dto';
import { OneCgiarUser } from './entities/one-cgiar-user.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('One CGIAR Users')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class OneCgiarUserController {
  constructor(private readonly oneCgiarUserService: OneCgiarUserService) {}

  @Get()
  @ApiOperation({
    summary: 'List One CGIAR users',
    description: 'Users registered as innovation contributors in the catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.oneCgiarUserService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.oneCgiarUserService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateOneCgiarUserDtoList: UpdateOneCgiarUserDto[],
  ) {
    try {
      const result: OneCgiarUser[] = await this.oneCgiarUserService.update(
        updateOneCgiarUserDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

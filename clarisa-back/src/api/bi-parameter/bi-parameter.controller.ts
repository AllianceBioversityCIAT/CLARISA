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
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BiParameterService } from './bi-parameter.service';
import { UpdateBiParameterDto } from './dto/update-bi-parameter.dto';
import { BiParameter } from './entities/bi-parameter.entity';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
//@UseGuards(JwtAuthGuard, PermissionGuard)
export class BiParameterController {
  constructor(private readonly biParameterService: BiParameterService) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.biParameterService.findAll(show);
  }

  @Get('getUnitAll')
  async findAllUnitParams() {
    return await this.biParameterService.findAllUnitParametersBi();
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.biParameterService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updatePolicyTypeDtoList: UpdateBiParameterDto[],
  ) {
    try {
      const result: BiParameter[] = await this.biParameterService.update(
        updatePolicyTypeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

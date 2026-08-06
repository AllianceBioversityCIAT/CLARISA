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
import { BeneficiaryService } from './beneficiary.service';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { Response } from 'express';
import { Beneficiary } from './entities/beneficiary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Beneficiary')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  @Get()
  @ApiOperation({
    summary: 'List beneficiaries',
    description: 'Beneficiary types targeted by innovations in the catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.beneficiaryService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.beneficiaryService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateBeneficiaryDtoList: UpdateBeneficiaryDto[],
  ) {
    try {
      const result: Beneficiary[] = await this.beneficiaryService.update(
        updateBeneficiaryDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

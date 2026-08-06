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
import { GovernanceTypeService } from './governance-type.service';
import { UpdateGovernanceTypeDto } from './dto/update-governance-type.dto';
import { Response } from 'express';
import { GovernanceType } from './entities/governance-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Governance Type')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GovernanceTypeController {
  constructor(private readonly governanceTypeService: GovernanceTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List governance types',
    description: 'Governance types used to classify innovations in the catalog.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.governanceTypeService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.governanceTypeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateGovernanceTypeDtoList: UpdateGovernanceTypeDto[],
  ) {
    try {
      const result: GovernanceType[] = await this.governanceTypeService.update(
        updateGovernanceTypeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

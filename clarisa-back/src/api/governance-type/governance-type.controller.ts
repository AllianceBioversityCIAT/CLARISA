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
import { GovernanceTypeService } from './governance-type.service';
import { UpdateGovernanceTypeDto } from './dto/update-governance-type.dto';
import { Response } from 'express';
import { GovernanceType } from './entities/governance-type.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Governance Types')
export class GovernanceTypeController {
  constructor(private readonly governanceTypeService: GovernanceTypeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all beneficiaries. Defaults to active.',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.governanceTypeService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the beneficiary',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.governanceTypeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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

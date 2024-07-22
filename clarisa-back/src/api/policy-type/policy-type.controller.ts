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
import { PolicyTypeService } from '../policy-type/policy-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdatePolicyTypeDto } from '../policy-type/dto/update-policy-type.dto';
import { PolicyType } from '../policy-type/entities/policy-type.entity';
import { Response } from 'express';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PolicyTypeDto } from './dto/policy-type.dto';
import { SourceOption } from '../../shared/entities/enums/source-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Policy Types')
export class PolicyTypeController {
  constructor(private readonly policyTypeService: PolicyTypeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all policy types. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only policy types from a specific source. Defaults to all.',
  })
  @ApiOkResponse({ type: [PolicyTypeDto] })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.policyTypeService.findAll(show, type);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the policy type',
  })
  @ApiOkResponse({ type: [PolicyTypeDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.policyTypeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updatePolicyTypeDtoList: UpdatePolicyTypeDto[],
  ) {
    try {
      const result: PolicyType[] = await this.policyTypeService.update(
        updatePolicyTypeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { PolicyStageService } from './policy-stage.service';
import { UpdatePolicyStageDto } from './dto/update-policy-stage.dto';
import { Response } from 'express';
import { PolicyStage } from './entities/policy-stage.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PolicyStageDto } from './dto/policy-stage.dto';
import { SourceOption } from '../../shared/entities/enums/source-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Policy Stages')
export class PolicyStageController {
  constructor(private readonly policyStageService: PolicyStageService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all policy stages. Defaults to active.',
  })
  @ApiQuery({
    name: 'type',
    enum: SourceOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only policy stages from a specific source. Defaults to all',
  })
  @ApiOkResponse({ type: [PolicyStageDto] })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.policyStageService.findAll(show, type);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the policy stage',
  })
  @ApiOkResponse({ type: [PolicyStageDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.policyStageService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updatePolicyStageDtoList: UpdatePolicyStageDto[],
  ) {
    try {
      const result: PolicyStage[] = await this.policyStageService.update(
        updatePolicyStageDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Res,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { GlobalTargetService } from './global-target.service';
import { UpdateGlobalTargetDto } from './dto/update-global-target.dto';
import { GlobalTarget } from './entities/global-target.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalTargetDto } from './dto/global-target.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Global Targets')
export class GlobalTargetController {
  constructor(private readonly globalTargetsService: GlobalTargetService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all global targets. Defaults to active.',
  })
  @ApiOkResponse({ type: [GlobalTargetDto] })
  findAll(@Query('show') show: FindAllOptions) {
    return this.globalTargetsService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the global target',
  })
  @ApiOkResponse({ type: [GlobalTargetDto] })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.globalTargetsService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateGlobalTargetDto[],
  ) {
    try {
      const result: GlobalTarget[] =
        await this.globalTargetsService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

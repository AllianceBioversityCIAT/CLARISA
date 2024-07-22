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
import { InitiativeService } from './initiative.service';
import { UpdateInitiativeDto } from './dto/update-initiative.dto';
import { Response } from 'express';
import { Initiative } from './entities/initiative.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InitiativeDto } from './dto/initiative.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Initiatives')
export class InitiativeController {
  constructor(private readonly initiativeService: InitiativeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all initiatives. Defaults to active.',
  })
  @ApiOkResponse({ type: [InitiativeDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.initiativeService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the initiative',
  })
  @ApiOkResponse({ type: [InitiativeDto] })
  async findOneById(@Param('id', ParseIntPipe) id: number) {
    return await this.initiativeService.findOne(id);
  }

  @Get('official-code/:officialCode')
  @ApiParam({
    name: 'officialCode',
    type: String,
    required: true,
    description: 'The official code of the initiative',
  })
  @ApiOkResponse({ type: [InitiativeDto] })
  async findOneByOfficialCode(@Param('officialCode') officialCode: string) {
    return await this.initiativeService.findOneByOfficialCode(officialCode);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateInitiativeDtoList: UpdateInitiativeDto[],
  ) {
    try {
      const result: Initiative[] = await this.initiativeService.update(
        updateInitiativeDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

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
import { GeneralAcronymService } from './general-acronym.service';
import { UpdateGeneralAcronymDto } from './dto/update-general-acronym.dto';
import { Response } from 'express';
import { GeneralAcronym } from './entities/general-acronym.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GeneralAcronymDto } from './dto/general-acronym.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('General Acronyms')
export class GeneralAcronymController {
  constructor(private readonly generalAcronymService: GeneralAcronymService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all general acronyms. Defaults to active.',
  })
  @ApiOkResponse({ type: [GeneralAcronymDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.generalAcronymService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the general acronym',
  })
  @ApiOkResponse({ type: [GeneralAcronymDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.generalAcronymService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateGeneralAcronymDtoList: UpdateGeneralAcronymDto[],
  ) {
    try {
      const result: GeneralAcronym[] = await this.generalAcronymService.update(
        updateGeneralAcronymDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

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
import { DepthDescriptionService } from './depth-description.service';
import { UpdateDepthDescriptionDto } from './dto/update-depth-description.dto';
import { DepthDescription } from './entities/depth-description.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DepthDescriptionDto } from './dto/depth-description.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Depths Description')
export class DepthDescriptionController {
  constructor(
    private readonly depthDescriptionService: DepthDescriptionService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all depths description. Defaults to active.',
  })
  @ApiOkResponse({ type: [DepthDescriptionDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.depthDescriptionService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the depth description',
  })
  @ApiOkResponse({ type: [DepthDescriptionDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.depthDescriptionService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateDepthDescriptionDtoList: UpdateDepthDescriptionDto[],
  ) {
    try {
      const result: DepthDescription[] =
        await this.depthDescriptionService.update(
          updateDepthDescriptionDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

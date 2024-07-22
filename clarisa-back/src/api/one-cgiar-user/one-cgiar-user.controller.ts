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
  HttpStatus,
  HttpException,
  Res,
} from '@nestjs/common';
import { OneCgiarUserService } from './one-cgiar-user.service';
import { UpdateOneCgiarUserDto } from './dto/update-one-cgiar-user.dto';
import { OneCgiarUser } from './entities/one-cgiar-user.entity';
import { Response } from 'express';
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
@ApiTags('OneCGIAR Users')
export class OneCgiarUserController {
  constructor(private readonly oneCgiarUserService: OneCgiarUserService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all OneCGIAR users. Defaults to active.',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.oneCgiarUserService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the OneCGIAR user',
  })
  @ApiOkResponse({ type: [BasicDtoV1] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.oneCgiarUserService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateOneCgiarUserDtoList: UpdateOneCgiarUserDto[],
  ) {
    try {
      const result: OneCgiarUser[] = await this.oneCgiarUserService.update(
        updateOneCgiarUserDtoList,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

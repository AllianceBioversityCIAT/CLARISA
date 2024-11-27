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
import { HomepageClarisaEndpointService } from './homepage-clarisa-endpoint.service';
import { UpdateHomepageClarisaEndpointDto } from './dto/update-homepage-clarisa-endpoint.dto';
import { HomepageClarisaEndpoint } from './entities/homepage-clarisa-endpoint.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiExcludeController } from '@nestjs/swagger';

//@ClarisaPageOnly()
//@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class HomepageClarisaEndpointController {
  constructor(
    private readonly homepageClarisaEndpointService: HomepageClarisaEndpointService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.homepageClarisaEndpointService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.homepageClarisaEndpointService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body()
    updateHomepageClarisaEndpointDtoList: UpdateHomepageClarisaEndpointDto[],
  ) {
    try {
      const result: HomepageClarisaEndpoint[] =
        await this.homepageClarisaEndpointService.update(
          updateHomepageClarisaEndpointDtoList,
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

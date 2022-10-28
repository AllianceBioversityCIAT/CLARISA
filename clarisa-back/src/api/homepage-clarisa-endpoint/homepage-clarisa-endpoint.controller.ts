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
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { HomepageClarisaEndpoint } from './entities/homepage-clarisa-endpoint.entity';
import { Response } from 'express';

//@ClarisaPageOnly()
//@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
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

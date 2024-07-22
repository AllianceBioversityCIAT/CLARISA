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
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CountryService } from './country.service';
import { UpdateCountryDto } from './dto/update-country.dto';
import { Country } from './entities/country.entity';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CountryDto } from './dto/country.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all countries. Defaults to active.',
  })
  @ApiOkResponse({ type: [CountryDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.countryService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The ISO code of the country',
  })
  @ApiOkResponse({ type: [CountryDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.countryService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
  async update(
    @Res() res: Response,
    @Body() updateCountryDtoList: UpdateCountryDto[],
  ) {
    try {
      const result: Country[] =
        await this.countryService.update(updateCountryDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

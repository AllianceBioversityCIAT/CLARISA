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
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CountryService } from './country.service';
import { CountryDto } from './dto/country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { Country } from './entities/country.entity';

@ApiTags('Country')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  @ApiOperation({
    summary: 'List countries',
    description:
      'Returns the official list of countries following the ISO-3166 standard, including their UN region (M49) and geoposition. One of the most consumed control lists across CGIAR platforms (PRMS, MEL, MARLO).',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      "Filter by status: 'all', 'active' (active only) or 'inactive' (inactive only). Active records are returned by default.",
  })
  @ApiOkResponse({ type: CountryDto, isArray: true, description: 'List of countries.' })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.countryService.findAll(show);
  }

  @Get('get/:id')
  @ApiOperation({
    summary: 'Get a country by ID',
    description: 'Returns a single country identified by its internal ID.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Internal country ID.' })
  @ApiOkResponse({ type: CountryDto, description: 'The requested country.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.countryService.findOne(id);
  }

  @Patch('update')
  @ApiOperation({
    summary: 'Update countries',
    description:
      'Updates one or more countries. Administrative operation (requires authentication).',
  })
  @ApiBody({ type: UpdateCountryDto, isArray: true })
  @ApiOkResponse({ type: CountryDto, isArray: true, description: 'Updated countries.' })
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

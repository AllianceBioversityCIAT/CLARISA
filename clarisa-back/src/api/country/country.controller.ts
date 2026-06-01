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
    summary: 'Listar paises',
    description:
      'Devuelve la lista oficial de paises segun el estandar ISO-3166, con su region UN (M49) y geoposicion. Es una de las control lists mas consumidas por las plataformas del CGIAR (PRMS, MEL, MARLO).',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      "Filtra por estado: 'all' (todos), 'active' (solo activos) o 'inactive' (solo inactivos). Por defecto se devuelven los activos.",
  })
  @ApiOkResponse({ type: CountryDto, isArray: true, description: 'Lista de paises.' })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.countryService.findAll(show);
  }

  @Get('get/:id')
  @ApiOperation({
    summary: 'Obtener un pais por ID',
    description: 'Devuelve un unico pais identificado por su ID interno.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID interno del pais.' })
  @ApiOkResponse({ type: CountryDto, description: 'El pais solicitado.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.countryService.findOne(id);
  }

  @Patch('update')
  @ApiOperation({
    summary: 'Actualizar paises',
    description:
      'Actualiza uno o varios paises. Operacion administrativa (requiere autenticacion).',
  })
  @ApiBody({ type: UpdateCountryDto, isArray: true })
  @ApiOkResponse({ type: CountryDto, isArray: true, description: 'Paises actualizados.' })
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

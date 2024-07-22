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
} from '@nestjs/common';
import { OldInstitutionService } from './old-institution.service';
import { UpdateOldInstitutionDto } from './dto/update-old-institution.dto';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { OldInstitution } from './entities/old-institution.entity';
import { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@ApiExcludeController()
export class OldInstitutionController {
  constructor(private readonly oldInstitutionService: OldInstitutionService) {}

  @Get()
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('from') from: string = undefined,
  ) {
    return await this.oldInstitutionService.findAll(show, from);
  }

  @Get('simple')
  async findAllSimple(@Query('show') show: FindAllOptions) {
    return await this.oldInstitutionService.findAllSimple(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.oldInstitutionService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateOldInstitutionDto[],
  ) {
    try {
      const result: OldInstitution[] =
        await this.oldInstitutionService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

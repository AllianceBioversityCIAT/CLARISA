import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CgiarEntityService } from './cgiar-entity.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CgiarEntityController {
  constructor(private readonly cgiarEntityService: CgiarEntityService) {}

  @Get()
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.cgiarEntityService.findAll(show, type);
  }

  @Get('getByInitiative')
  async findAllFlagships(
    @Query('show') show: FindAllOptions,
    @Query('initiative') initiative: string,
  ) {
    return await this.cgiarEntityService.findAllFlagships(show, initiative);
  }

  @Get('getByFlagship')
  async findAllWorkpackages(
    @Query('show') show: FindAllOptions,
    @Query('flagship') flagship: string,
  ) {
    return await this.cgiarEntityService.findAllWorkpackages(show, flagship);
  }

  @Get('getEntityTypeTree')
  async findEntityTypeTree(@Query('type') type: string) {
    return await this.cgiarEntityService.findAllEntityTypeTree(type);
  }

  @Get('getFrameworkTree')
  async findFrameworkTree(@Query('framework') framework: string) {
    return await this.cgiarEntityService.findAllFrameworkTree(framework);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityService.findOne(id);
  }
}

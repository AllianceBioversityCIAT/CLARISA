import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Version,
} from '@nestjs/common';
import { CgiarEntityService } from './cgiar-entity.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CgiarEntityController {
  constructor(private readonly cgiarEntityService: CgiarEntityService) {}

  @Version('1')
  @Get()
  async findAllV1(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.cgiarEntityService.findAllV1(show, type);
  }

  @Version('1')
  @Get('get/:id')
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityService.findOneV1(id);
  }

  @Version('2')
  @Get()
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityService.findAllV2(show);
  }

  @Version('2')
  @Get('get/:id')
  async findOneV2(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityService.findOneV2(id);
  }

  @Version('2')
  @Get('by-portfolio')
  async findByPortfolioV2(
    @Query('portfolioId') portfolioIds: number[],
    @Query('show') show: FindAllOptions,
  ) {
    const ids = Array.isArray(portfolioIds)
      ? portfolioIds.map(Number)
      : String(portfolioIds)
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id));

    const results = await Promise.all(
      ids.map((id) => this.cgiarEntityService.findByPortfolioV2(id, show)),
    );
    return results.flat();
  }
}

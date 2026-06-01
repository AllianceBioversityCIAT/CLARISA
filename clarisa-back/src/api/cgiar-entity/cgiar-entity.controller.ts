import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CgiarEntityService } from './cgiar-entity.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('CGIAR Entity')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CgiarEntityController {
  constructor(private readonly cgiarEntityService: CgiarEntityService) {}

  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'List CGIAR entities',
    description:
      'Official list of CGIAR Centers, CGIAR Research Programs (CRPs) and CGIAR Platforms (PTFs), including entities that are no longer active.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Optional filter by CGIAR entity type.',
  })
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
  @ApiOperation({
    summary: 'List CGIAR entities',
    description:
      'Official list of CGIAR Centers, CGIAR Research Programs (CRPs) and CGIAR Platforms (PTFs), including entities that are no longer active.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiQuery({ name: 'type', required: false, description: 'Optional filter by CGIAR entity type.' })
  @ApiQuery({ name: 'portfolioId', required: false, description: 'Optional filter by portfolio ID.' })
  @ApiQuery({ name: 'year', required: false, description: 'Optional filter by year.' })
  async findAllV2(
    @Query('show') show: FindAllOptions,
    @Query('type') type?: string,
    @Query('portfolioId') portfolioId?: string,
    @Query('year') year?: string,
  ) {
    return await this.cgiarEntityService.findAllV2(show, {
      type,
      portfolioId: this.parseOptionalNumber(portfolioId),
      year: this.parseOptionalNumber(year),
    });
  }

  @Get('groups')
  async getHierarchy(): Promise<any[]> {
    return this.cgiarEntityService.getGlobalUnitsHierarchy();
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
  private parseOptionalNumber(value?: string): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

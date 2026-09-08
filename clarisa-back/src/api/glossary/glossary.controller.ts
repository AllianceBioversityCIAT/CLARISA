import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  HttpException,
  HttpStatus,
  Res,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GlossaryService } from './glossary.service';
import { UpdateGlossaryDto } from './dto/update-glossary.dto';
import { Glossary } from './entities/glossary.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Glossary')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GlossaryController {
  constructor(private readonly glossaryService: GlossaryService) {}

  @Get()
  @ApiOperation({
    summary: 'List glossary terms',
    description:
      'Each term includes a "portfolios" array with the CGIAR portfolios ' +
      '(id, name, acronym) the term belongs to. ' +
      "CLARISA Glossary is CGIAR's standardized glossary of terms used in " +
      'performance management, planning, and reporting. It defines the common ' +
      'vocabulary — covering structural concepts (Program, Accelerator, Area of ' +
      'Work, Portfolio), results-framework terms (Output, Outcome, Impact, ' +
      'Impact Area, Indicator, Theory of Change), and scaling/innovation terms ' +
      '(Innovation Package, Scaling Readiness, IPSR) — so that Centers, ' +
      'Programs & Accelerators use consistent definitions when planning work ' +
      'and reporting results. ' +
      'Each term may also carry its provenance: "source" (the document or body ' +
      'the definition comes from), "sourceUrl" (a link to it, when public) and ' +
      '"referenceDate" (the date of that material, as YYYY-MM-DD). The three are ' +
      'null while a definition has not been attributed yet. ' +
      'Last updated September 2026.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  findAll(@Query('show') show: FindAllOptions) {
    return this.glossaryService.findAll(show);
  }

  @Get('/dashboard')
  findAllForDashboard(@Query('show') show: FindAllOptions) {
    return this.glossaryService.findAll(show, true);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.glossaryService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateGlossaryDto: UpdateGlossaryDto[],
  ) {
    try {
      const result: Glossary[] =
        await this.glossaryService.update(updateGlossaryDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

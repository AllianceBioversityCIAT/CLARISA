import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResultsOverviewQueryDto } from './dto/results-overview-query.dto';
import { ResultsOverviewPaginatedDto } from './dto/results-overview-response.dto';
import { ResultsOverviewService } from './services/results-overview.service';

@ApiTags('Results Overview')
@Controller('results-overview')
export class ResultsOverviewController {
  private readonly logger = new Logger(ResultsOverviewController.name);

  constructor(
    private readonly resultsOverviewService: ResultsOverviewService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated results overview',
    description: `
Returns a paginated list of PRMS results with their science programs, centers, phase, and status.

**Filters available:**
- \`version_id\` — restrict to a specific reporting phase
- \`status_id\` — one or more status IDs (repeatable: \`status_id=1&status_id=2\`)
- \`initiative_id\` — matches both lead and contributing science programs
- \`center_code\` — matches both lead and contributing centers (e.g. \`CIP\`, \`CIMMYT\`)
- \`search\` — partial match on title and description

**Pagination:**
- \`page\` — 1-based page number (default: 1)
- \`limit\` — records per page, max 100 (default: 25)
    `.trim(),
  })
  @ApiOkResponse({ type: ResultsOverviewPaginatedDto })
  async getResultsOverview(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: ResultsOverviewQueryDto,
  ): Promise<ResultsOverviewPaginatedDto> {
    try {
      return await this.resultsOverviewService.getResultsOverview(query);
    } catch (error) {
      this.logger.error('Error fetching results overview', error);
      throw new HttpException(
        'Failed to retrieve results overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

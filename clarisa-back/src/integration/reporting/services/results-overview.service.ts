import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResultsOverviewQueryDto } from '../dto/results-overview-query.dto';
import {
  ResultsOverviewItemDto,
  ResultsOverviewPaginatedDto,
} from '../dto/results-overview-response.dto';

@Injectable()
export class ResultsOverviewService {
  private readonly logger = new Logger(ResultsOverviewService.name);

  constructor(
    @InjectDataSource('reporting')
    private readonly reportingDataSource: DataSource,
  ) {}

  async getResultsOverview(
    query: ResultsOverviewQueryDto,
  ): Promise<ResultsOverviewPaginatedDto> {
    const {
      version_id,
      status_id,
      initiative_id,
      center_code,
      search,
      page = 1,
      limit = 25,
    } = query;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (version_id != null) {
      conditions.push('vro.version_id = ?');
      params.push(version_id);
    }

    if (status_id?.length) {
      const placeholders = status_id.map(() => '?').join(', ');
      conditions.push(`vro.status_id IN (${placeholders})`);
      params.push(...status_id);
    }

    if (initiative_id != null) {
      conditions.push(`(
        vro.lead_initiative_program_id = ?
        OR FIND_IN_SET(?, REPLACE(vro.contributing_initiative_program_ids, ';', ','))
      )`);
      params.push(initiative_id, String(initiative_id));
    }

    if (center_code) {
      conditions.push(`(
        vro.lead_center_code = ?
        OR FIND_IN_SET(?, REPLACE(vro.contributing_center_codes, ';', ','))
      )`);
      params.push(center_code, center_code);
    }

    if (search?.trim()) {
      conditions.push(
        '(vro.result_title LIKE ? OR vro.result_description LIKE ?)',
      );
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT *
      FROM   vw_results_overview vro
      ${whereClause}
      ORDER  BY vro.result_code ASC
      LIMIT  ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM   vw_results_overview vro
      ${whereClause}
    `;

    this.logger.log(
      `Fetching results overview — page ${page}, limit ${limit}, filters: ${JSON.stringify({ version_id, status_id, initiative_id, center_code, search })}`,
    );

    const [data, countResult] = await Promise.all([
      this.reportingDataSource.query(dataQuery, [
        ...params,
        limit,
        offset,
      ]) as Promise<ResultsOverviewItemDto[]>,
      this.reportingDataSource.query(countQuery, params) as Promise<
        { total: string }[]
      >,
    ]);

    const total = Number(countResult[0].total);

    this.logger.log(`Results overview returned ${data.length} / ${total} rows`);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}

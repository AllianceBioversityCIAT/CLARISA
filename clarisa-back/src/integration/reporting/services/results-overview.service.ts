import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResultsOverviewQueryDto } from '../dto/results-overview-query.dto';
import {
  ResultsOverviewItemDto,
  ResultsOverviewPaginatedDto,
} from '../dto/results-overview-response.dto';

const VIEW = 'vw_results_innovations_overview';

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
      result_type_id,
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

    if (result_type_id?.length) {
      const placeholders = result_type_id.map(() => '?').join(', ');
      conditions.push(`vro.result_type_id IN (${placeholders})`);
      params.push(...result_type_id);
    }

    if (initiative_id != null) {
      // The view does not expose contributing IDs as a column, so we filter
      // directly against the source table to cover both lead and contributing.
      conditions.push(`EXISTS (
        SELECT 1
        FROM   results_by_inititiative rbi2
        WHERE  rbi2.result_id      = vro.result_id
          AND  rbi2.inititiative_id = ?
          AND  rbi2.is_active       = 1
      )`);
      params.push(initiative_id);
    }

    if (center_code) {
      // Same pattern — query source table directly for lead + contributing.
      conditions.push(`EXISTS (
        SELECT 1
        FROM   results_center rc2
        WHERE  rc2.result_id  = vro.result_id
          AND  rc2.center_id  = ?
          AND  rc2.is_active  = 1
      )`);
      params.push(center_code);
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
      FROM   ${VIEW} vro
      ${whereClause}
      ORDER  BY vro.result_code ASC
      LIMIT  ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM   ${VIEW} vro
      ${whereClause}
    `;

    this.logger.log(
      `Fetching innovations overview — page ${page}, limit ${limit}, filters: ${JSON.stringify({ version_id, status_id, result_type_id, initiative_id, center_code, search })}`,
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

    this.logger.log(
      `Innovations overview returned ${data.length} / ${total} rows`,
    );

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

import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { Response } from 'express';
import { DataSource } from 'typeorm';

/**
 * Lightweight health check for readiness/liveness (load balancers, deploy
 * monitoring). Lives at the root: GET /health (outside the /api prefix).
 *
 * Returns HTTP 200 when the DB is reachable, and HTTP 503 when it is not, so it
 * can be used directly as a readiness probe.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Service and database connectivity status' })
  async check(@Res() res: Response) {
    let db: 'up' | 'down' = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }

    const healthy = db === 'up';
    return res
      .status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        status: healthy ? 'ok' : 'unavailable',
        db,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
  }
}

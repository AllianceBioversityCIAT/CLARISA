import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { MetricsService } from './metrics.service';
import { MetricsDto } from './dto/metrics.dto';

@ApiTags('Metrics')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class MetricsController {
  constructor(private readonly _metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Size of the CLARISA catalogue',
    description:
      'How many records CLARISA currently holds, one count per catalogue, so ' +
      'that a page or a report can state the size of the registry without ' +
      'downloading it. Counting through the public endpoints is the ' +
      'alternative this replaces: "api/institutions" alone is about 4.7 MB. ' +
      'Every count is a plain number and reflects only ACTIVE records, which ' +
      'is what the public endpoints return by default — so a figure shown here ' +
      'can always be reproduced by listing the matching endpoint. ' +
      '"generatedAt" is when the figures were computed (ISO-8601, UTC); the ' +
      'response is cached for one hour, so it may trail the database by that ' +
      'much. ' +
      'The six keys are a stable contract: new ones may be added over time, ' +
      'but an existing key is never renamed nor removed, and none of them is ' +
      'ever null.',
  })
  async find(): Promise<MetricsDto> {
    return await this._metricsService.find();
  }
}

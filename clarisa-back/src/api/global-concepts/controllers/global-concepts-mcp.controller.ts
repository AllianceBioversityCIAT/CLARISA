import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { GlobalConceptsEnabledGuard } from '../utils/feature-enabled.guard';
import { McpService } from '../services/mcp.service';

/**
 * `api/global-concepts/mcp` — stateless Streamable HTTP MCP endpoint (D7).
 * POST carries JSON-RPC and is answered with plain JSON; there is no session
 * and no server-to-client stream, so GET and DELETE answer 405 as the
 * transport specification allows. Declared before the public controller so
 * `GET mcp` never reaches the `:scheme` route.
 */
@ApiExcludeController()
@Controller('mcp')
@UseGuards(GlobalConceptsEnabledGuard)
export class GlobalConceptsMcpController {
  constructor(private readonly mcp: McpService) {}

  @Post()
  @HttpCode(200)
  async post(@Body() body: unknown, @Res() res: Response) {
    if (body === undefined || body === null || typeof body !== 'object') {
      res.status(400).json(this.mcp.error(null, -32700, 'Parse error'));
      return;
    }
    const messages = Array.isArray(body) ? body : [body];
    if (!messages.length) {
      res.status(400).json(this.mcp.error(null, -32600, 'Invalid request'));
      return;
    }
    const answers = (
      await Promise.all(messages.map((m) => this.mcp.handle(m)))
    ).filter((a) => a !== null);
    if (!answers.length) {
      res.status(202).end();
      return;
    }
    res
      .status(200)
      .type('application/json')
      .send(JSON.stringify(Array.isArray(body) ? answers : answers[0]));
  }

  @Get()
  get(@Res() res: Response) {
    res.status(405).set('Allow', 'POST').end();
  }

  @Delete()
  remove(@Res() res: Response) {
    res.status(405).set('Allow', 'POST').end();
  }
}

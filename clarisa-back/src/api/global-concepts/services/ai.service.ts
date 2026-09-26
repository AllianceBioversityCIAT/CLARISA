import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { env } from 'process';
import { DataSource } from 'typeorm';
import { GcAiUsage } from '../entities/gc-ai-usage.entity';
import { GlobalConceptsConfig } from '../global-concepts.config';

/** USD per 1M tokens [input, output]. Unknown models are priced high on purpose. */
const PRICES: Record<string, [number, number]> = {
  'gpt-5-mini': [0.25, 2],
  'gpt-5.4-mini': [0.75, 4.5],
  'gpt-5.4-nano': [0.2, 1.25],
};
const FALLBACK_PRICE: [number, number] = [5, 30];

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 60_000;

export const costOf = (model: string, input: number, output: number) => {
  const [pin, pout] = PRICES[model] ?? FALLBACK_PRICE;
  return (input * pin + output * pout) / 1_000_000;
};

const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

/**
 * Server-side OpenAI client for the advisory features (D8). No SDK: one
 * `fetch` to Chat Completions with a strict JSON schema, so the answer is
 * always parseable. Every call is checked against a monthly cap stored in
 * `gc_ai_usage`; nothing the model returns is written anywhere by this class.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly dataSource: DataSource) {}

  async usage() {
    const row = await this.dataSource.manager.findOne(GcAiUsage, {
      where: { month: monthKey() },
    });
    return {
      enabled: GlobalConceptsConfig.aiEnabled,
      model: GlobalConceptsConfig.aiModel,
      month: monthKey(),
      spent_usd: Number(row?.cost_usd ?? 0),
      cap_usd: GlobalConceptsConfig.aiMonthlyCapUsd,
      calls: Number(row?.calls ?? 0),
    };
  }

  /** One structured call. `schema` is a JSON schema for the whole answer object. */
  async json<T>(
    task: string,
    system: string,
    user: unknown,
    schema: Record<string, unknown>,
  ): Promise<T> {
    const { spent_usd, cap_usd } = await this.usage();
    if (spent_usd >= cap_usd) {
      throw new ServiceUnavailableException(
        'The monthly AI budget of Global Concepts is used up; the feature is available again next month.',
      );
    }
    const model = GlobalConceptsConfig.aiModel;
    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: typeof user === 'string' ? user : JSON.stringify(user),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: task, strict: true, schema },
      },
    };
    let res: Response;
    try {
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPEN_AI_CLARISA_ASSISTANT_TOKEN}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.warn(`${task}: ${(err as Error)?.message}`);
      throw new BadGatewayException('The AI service did not answer');
    }
    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string; refusal?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string };
    } | null;
    if (data?.usage) {
      await this.record(
        model,
        data.usage.prompt_tokens ?? 0,
        data.usage.completion_tokens ?? 0,
      );
    }
    if (!res.ok) {
      this.logger.warn(`${task}: HTTP ${res.status} ${data?.error?.message}`);
      throw new BadGatewayException('The AI service returned an error');
    }
    const content = data?.choices?.[0]?.message?.content;
    try {
      if (!content) throw new Error('empty');
      return JSON.parse(content) as T;
    } catch {
      throw new BadGatewayException('The AI service returned no usable answer');
    }
  }

  /** Atomic upsert, so concurrent calls never lose spend. */
  private async record(model: string, input: number, output: number) {
    const cost = costOf(model, input, output);
    await this.dataSource
      .query(
        `INSERT INTO gc_ai_usage (month, calls, input_tokens, output_tokens, cost_usd)
         VALUES (?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE calls = calls + 1,
           input_tokens = input_tokens + VALUES(input_tokens),
           output_tokens = output_tokens + VALUES(output_tokens),
           cost_usd = cost_usd + VALUES(cost_usd)`,
        [monthKey(), input, output, cost.toFixed(6)],
      )
      .catch((err) =>
        this.logger.error(`AI usage not recorded: ${(err as Error)?.message}`),
      );
  }
}

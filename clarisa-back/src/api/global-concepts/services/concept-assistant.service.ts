import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { GcField } from '../entities/gc-field.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GlobalConceptsConfig } from '../global-concepts.config';
import { AssistantChatDto } from '../dto/assistant.dto';
import {
  AssistContext,
  AssistRateLimiter,
  AssistStep,
  RawAnswer,
  assistantAnswerSchema,
  buildAssistantPrompt,
  sanitizeAnswer,
} from '../utils/concept-assistant';
import { AI_BUDGET_USED_UP, AiService } from './ai.service';
import { ConceptGraphLoader } from './concept-graph.loader';

export const ASSIST_DISABLED =
  'The concept assistant is switched off on this server.';
export const ASSIST_NO_KEY =
  'The concept assistant has no AI key configured on this server.';
export const ASSIST_AI_DOWN =
  'The assistant could not get an answer from the AI service. Try again in a moment; your form is unchanged.';
export const ASSIST_RATE_LIMITED =
  'You have sent many messages to the assistant in a short time. Wait a few minutes and try again.';

/**
 * Concept assistant (assistant-contract.md): a chat beside the concept form
 * that proposes field values. Advisory only — nothing here writes a concept,
 * and the conversation is not stored: only the spend reaches `gc_ai_usage`.
 */
@Injectable()
export class ConceptAssistantService {
  private readonly logger = new Logger(ConceptAssistantService.name);
  /** 20 turns / 10 min per user, in memory (see AssistRateLimiter). */
  readonly limiter = new AssistRateLimiter(20, 10 * 60_000);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ai: AiService,
    private readonly loader: ConceptGraphLoader,
  ) {}

  async status(): Promise<{
    enabled: boolean;
    reason?: string;
    remainingUsd: number;
  }> {
    const blocked = this.blockedReason();
    const { spent_usd, cap_usd } = await this.ai.usage();
    const remainingUsd = Math.max(0, Number((cap_usd - spent_usd).toFixed(4)));
    if (blocked) return { enabled: false, reason: blocked, remainingUsd };
    if (remainingUsd <= 0)
      return { enabled: false, reason: AI_BUDGET_USED_UP, remainingUsd };
    return { enabled: true, remainingUsd };
  }

  async chat(
    code: string,
    dto: AssistantChatDto,
    user: string,
  ): Promise<{ reply: string; steps: AssistStep[]; costUsd: number }> {
    const blocked = this.blockedReason();
    if (blocked) throw new ServiceUnavailableException(blocked);
    const last = dto.messages?.[dto.messages.length - 1];
    if (!last || last.role !== 'user')
      throw new BadRequestException(
        'messages must end with the person’s message',
      );
    const ctx = await this.context(code);
    if (!this.limiter.take(user))
      throw new HttpException(
        ASSIST_RATE_LIMITED,
        HttpStatus.TOO_MANY_REQUESTS,
      );

    const system = buildAssistantPrompt(ctx, {
      draft: dto.draft,
      edits: dto.edits,
      termId: dto.termId,
    });
    let answer: { value: RawAnswer; costUsd: number };
    try {
      answer = await this.ai.chatJson<RawAnswer>(
        'concept_assistant',
        system,
        dto.messages.map((m) => ({ role: m.role, content: m.content })),
        assistantAnswerSchema(ctx),
      );
    } catch (err) {
      // Budget used up keeps its own 503; anything else from the AI is a 502, never a 500.
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.warn(`concept assistant: ${(err as Error)?.message}`);
      throw new BadGatewayException(ASSIST_AI_DOWN);
    }
    const clean = sanitizeAnswer(ctx, answer.value, {
      edits: dto.edits,
      lastUserMessage: last.content,
    });
    return {
      reply:
        clean.reply ||
        (clean.steps.length
          ? 'Here are my suggestions.'
          : 'I have no suggestion for this message.'),
      steps: clean.steps,
      costUsd: Number(answer.costUsd.toFixed(6)),
    };
  }

  private blockedReason(): string | null {
    if (!GlobalConceptsConfig.aiSwitchOn) return ASSIST_DISABLED;
    if (!GlobalConceptsConfig.aiHasKey) return ASSIST_NO_KEY;
    return null;
  }

  /** Active list values (codes + labels) and active custom fields of the scheme. */
  async context(code: string): Promise<AssistContext> {
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const [rows, fields] = await Promise.all([
      manager.find(GcListValue, {
        where: { scope: In(['', scheme.code]), is_active: true },
      }),
      manager.find(GcField, {
        where: { scheme_id: scheme.id, is_active: true },
      }),
    ]);
    const lists = new Map<string, { value: string; label: string }[]>();
    for (const r of [...rows].sort(
      (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.value.localeCompare(b.value),
    )) {
      const list = lists.get(r.list_code) ?? [];
      if (!list.some((x) => x.value === r.value))
        list.push({ value: r.value, label: r.label });
      lists.set(r.list_code, list);
    }
    return {
      scheme: {
        code: scheme.code,
        title: scheme.title,
        description: scheme.description,
      },
      lists,
      customFields: fields,
    };
  }
}

import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Limits of the concept assistant contract (assistant-contract.md). */
export const ASSIST_MAX_MESSAGES = 20;
export const ASSIST_MAX_MESSAGE_CHARS = 4000;
export const ASSIST_MAX_EDITS = 50;
export const ASSIST_MAX_STEPS = 12;

export class AssistantMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  @MaxLength(ASSIST_MAX_MESSAGE_CHARS)
  content: string;
}

/** One manual edit of the form, in the order the person made it. */
export class AssistantEditDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  seq: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  field: string;

  @IsString()
  @MaxLength(20)
  tab: string;

  /** Any JSON value; trimmed before it reaches the model. */
  @Allow()
  before?: unknown;

  @Allow()
  after?: unknown;

  @IsString()
  @MaxLength(40)
  at: string;
}

export class AssistantChatDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  termId?: number;

  /** The form as it is now, keyed by field (custom fields as `x:<code>` or under `extra`). */
  @IsObject()
  draft: Record<string, unknown>;

  @IsArray()
  @ArrayMaxSize(ASSIST_MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  messages: AssistantMessageDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ASSIST_MAX_EDITS)
  @ValidateNested({ each: true })
  @Type(() => AssistantEditDto)
  edits: AssistantEditDto[] = [];
}

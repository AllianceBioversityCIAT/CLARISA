import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  GcProposalState,
  GcProposalType,
} from '../entities/gc-proposal.entity';

/**
 * A concept request. `payload` carries the concept fields (same names as the
 * admin DTOs) and is validated by the service against the DTO of its type,
 * so a request can never carry a field an admin could not set.
 */
export class SubmitRequestDto {
  @IsEnum(GcProposalType)
  type: GcProposalType;

  /** Concept the request is about (edit, deprecate, merge source, promote source). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  term_id?: number;

  /** Merge survivor. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  target_term_id?: number;

  /** Promote: scheme that receives the concept (usually `concepts`). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  target_scheme?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  rationale: string;

  /** Required for platforms (the person behind the key, asserted by the platform, V38). */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  requester_email?: string;

  /** Platform's own id for idempotent retries (V15). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[\w.:-]+$/, {
    message: 'external_request_id may only contain letters, digits, _ . : -',
  })
  external_request_id?: string;
}

/** Public form, step 1: the request plus an email to verify. */
export class StartPublicRequestDto extends SubmitRequestDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class VerifyPublicRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;
}

export class ResubmitRequestDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rationale?: string;
}

export enum GcRequestAction {
  START_REVIEW = 'start_review',
  REQUEST_CHANGES = 'request_changes',
  SEND_TO_VALIDATION = 'send_to_validation',
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class RequestTransitionDto {
  @IsEnum(GcRequestAction)
  action: GcRequestAction;

  /** The state the decider saw; the transition fails with 409 if it changed (V27). */
  @IsEnum(GcProposalState)
  expected_state: GcProposalState;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
}

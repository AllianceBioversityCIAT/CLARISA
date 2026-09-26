import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  GcConceptOrigin,
  GcConceptStatus,
} from '../entities/gc-concept.entity';
import { GcLabelKind, GcLabelStatus } from '../entities/gc-label.entity';
import { GcMatchType } from '../entities/gc-mapping.entity';
import { GcRelationKind } from '../entities/gc-relation.entity';

/** `YYYY-MM-DD`; an empty string clears the stored day. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fields shared by create and update, named as in the MELIAF data schema
 * template. List-driven fields (term_type, meliaf_function, meliaf_phase_*,
 * derivation, language) are checked against the module's controlled lists by
 * the service, not here: the lists are data and can grow without a deploy.
 */
export class ConceptFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  definition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  short_definition?: string;

  @IsOptional()
  @IsString()
  scope_note?: string;

  @IsOptional()
  @IsString()
  example_of_use?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  term_type?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  meliaf_function?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  meliaf_phase_primary?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  meliaf_phase_also?: string[];

  @IsOptional()
  @IsString()
  source_citation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  source_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  derivation?: string;

  @IsOptional()
  @IsEnum(GcConceptOrigin)
  origin?: GcConceptOrigin;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  validated_by?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @Matches(DAY, { message: 'date_validated must be YYYY-MM-DD' })
  date_validated?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  steward?: string;

  @IsOptional()
  @IsString()
  rights_note?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateConceptDto extends ConceptFieldsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  preferred_label: string;

  /** Keep a code from an existing register (e.g. the Lexicon's 2374); assigned when absent. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  term_id?: number;

  /** Admins may create straight into another status; defaults to draft. */
  @IsOptional()
  @IsEnum(GcConceptStatus)
  status?: GcConceptStatus;
}

export class UpdateConceptDto extends ConceptFieldsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  preferred_label?: string;
}

export class ConceptStatusDto {
  @IsEnum(GcConceptStatus)
  status: GcConceptStatus;

  /** Replacement (same scheme) when deprecating. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  replaced_by_term_id?: number;

  /** Required to deprecate without a replacement (D4). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class LabelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsEnum(GcLabelKind)
  kind: GcLabelKind;

  @IsOptional()
  @IsEnum(GcLabelStatus)
  status?: GcLabelStatus;
}

/** Replaces every non-default label of a concept. */
export class ConceptLabelsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LabelDto)
  labels: LabelDto[];
}

export class RelationDto {
  @IsEnum(GcRelationKind)
  kind: GcRelationKind;

  /** The other concept, in the same scheme (V7). For `broader`, the parent. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  target_term_id: number;
}

export class MappingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  target_scheme: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Matches(/^https?:\/\/\S+$/, { message: 'target_uri must be an http(s) URI' })
  target_uri: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  target_label?: string;

  @IsOptional()
  @IsEnum(GcMatchType)
  match_type?: GcMatchType;
}

export class MergeDto {
  /** The concept that survives; the one in the path is merged into it. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  into_term_id: number;
}

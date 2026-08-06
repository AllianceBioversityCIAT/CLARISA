import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InstitutionLineageRelationType } from '../entities/institution-lineage.entity';

/**
 * Payload for the lifecycle management endpoint: retire an institution and,
 * optionally, link it to the one that replaces it.
 *
 * Kept apart from `UpdateInstitutionDto` on purpose. That one is the shared,
 * unauthenticated bulk-edit payload; these fields decide whether an institution
 * consumed by PRMS, MEL, MARLO and STAR can still be used, and must never be
 * writable through the same door.
 */
export class UpdateInstitutionLifecycleDto {
  /** ISO yyyy-MM-dd. Send null to bring a retired institution back. */
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  startDate?: string | null;

  /**
   * ISO yyyy-MM-dd. null means the institution is valid and consumable; a date
   * means consumers must stop offering it for new records.
   */
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  endDate?: string | null;

  /** id of the institution that replaces this one. Omit if there is none. */
  @IsOptional()
  @IsInt()
  @Min(1)
  replacedByInstitutionId?: number;

  /** defaults to a plain rename when a successor is given */
  @IsOptional()
  @IsEnum(InstitutionLineageRelationType)
  relationType?: InstitutionLineageRelationType;

  /** date of the real-world change. Defaults to `endDate` when omitted. */
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  changeDate?: string;

  /** why the change happened. Stored on the edge and on the institution. */
  @IsOptional()
  @IsString()
  note?: string;
}

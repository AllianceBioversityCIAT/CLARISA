import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { InstitutionLineageRelationType } from '../entities/institution-lineage.entity';

/**
 * The three date fields land in DATE columns, which reject anything carrying a
 * time part: `IsDateString` alone lets `2025-12-31T00:00:00.000Z` through and
 * MySQL answers with a 500 and its own column names. Truncating it here instead
 * would be worse — an offset like `T23:00:00-05:00` denotes a different day —
 * so the only accepted shape is the calendar date itself.
 */
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CALENDAR_DATE_MESSAGE = '$property must be a calendar date (yyyy-MM-dd)';

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
  @Matches(CALENDAR_DATE, { message: CALENDAR_DATE_MESSAGE })
  startDate?: string | null;

  /**
   * ISO yyyy-MM-dd. null means the institution is valid and consumable; a date
   * means consumers must stop offering it for new records. Sending null revives
   * a retired institution and, because the two facts cannot be published apart,
   * also removes the successors recorded for it.
   */
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(CALENDAR_DATE, { message: CALENDAR_DATE_MESSAGE })
  endDate?: string | null;

  /**
   * id of the institution that replaces this one. Omit to leave the recorded
   * succession as it is; send null to remove it without reviving. Sending the
   * id already recorded is not an error: it rewrites `relationType`,
   * `changeDate` and `note` on the existing edge, which is the only way to
   * correct them.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  replacedByInstitutionId?: number | null;

  /** defaults to a plain rename when a successor is given */
  @IsOptional()
  @IsEnum(InstitutionLineageRelationType)
  relationType?: InstitutionLineageRelationType;

  /** date of the real-world change. Defaults to `endDate` when omitted. */
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(CALENDAR_DATE, { message: CALENDAR_DATE_MESSAGE })
  changeDate?: string;

  /**
   * why the change happened. Stored on the edge and on the institution.
   *
   * Bounded because both destinations are `TEXT` (65 535 *bytes*): without a
   * limit a longer note reaches MySQL, which answers `Data too long for column
   * 'modification_justification'`, and the exceptions filter republishes that
   * driver message verbatim as a 500. 5 000 characters is well under the limit
   * even at 4 bytes per character, and far beyond any real justification.
   */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
}

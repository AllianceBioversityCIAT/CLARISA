import { IsBoolean } from 'class-validator';

export class UpdateContentEditingDto {
  /** `true` pauses every create / edit of glossary terms and taxonomy concepts. */
  @IsBoolean()
  locked: boolean;
}

/** What the panel shows about the lock. */
export interface ContentEditingState {
  locked: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

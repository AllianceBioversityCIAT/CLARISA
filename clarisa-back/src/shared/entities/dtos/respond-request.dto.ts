/* eslint-disable @typescript-eslint/no-magic-numbers */
import { IsEmail, IsNotEmpty, Min, ValidateIf } from 'class-validator';
import { Immutable } from '../../utils/deep-immutable';

export class RespondRequestDto {
  @Min(1)
  requestId!: number;

  @Min(1)
  userId!: number;

  @IsNotEmpty()
  accept!: boolean;

  misAcronym!: string;

  @ValidateIf((o: Immutable<RespondRequestDto>) => !o.accept)
  @IsNotEmpty()
  rejectJustification!: string;

  @IsEmail()
  externalUserMail!: string;

  externalUserName!: string;

  externalUserComments!: string;
}

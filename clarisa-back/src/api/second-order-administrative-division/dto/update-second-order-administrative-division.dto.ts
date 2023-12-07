import { PartialType } from '@nestjs/mapped-types';
import { CreateSecondOrderAdministrativeDivisionDto } from './create-second-order-administrative-division.dto';

export class UpdateSecondOrderAdministrativeDivisionDto extends PartialType(
  CreateSecondOrderAdministrativeDivisionDto,
) {}

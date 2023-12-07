import { PartialType } from '@nestjs/mapped-types';
import { CreateFirstOrderAdministrativeDivisionDto } from './create-first-order-administrative-division.dto';

export class UpdateFirstOrderAdministrativeDivisionDto extends PartialType(
  CreateFirstOrderAdministrativeDivisionDto,
) {}

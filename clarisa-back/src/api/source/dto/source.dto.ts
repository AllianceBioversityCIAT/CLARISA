import { OmitType } from '@nestjs/mapped-types';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';

export class SourceDto extends OmitType(BasicDtoV1, ['description'] as const) {
  acronym: string;
  contact_point_id: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { InstitutionSimpleDto } from '../../institution/dto/institution-simple.dto';
import { InstitutionSourceDto } from './institution-source.dto';

export class InstitutionDictionaryDto extends InstitutionSimpleDto {
  @ApiProperty({
    description:
      'The list of institutions related to this one in other systems',
    type: [InstitutionSourceDto],
  })
  institutionRelatedList: InstitutionSourceDto[];
}

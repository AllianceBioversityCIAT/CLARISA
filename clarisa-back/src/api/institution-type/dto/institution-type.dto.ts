import { ApiProperty } from '@nestjs/swagger';
import { BaseInstitutionTypeDto } from './base-institution-type.dto';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class InstitutionTypeDto extends BaseInstitutionTypeDto {
  @ApiProperty({
    description: 'The description of the institution type',
    type: String,
    nullable: true,
  })
  @OpenSearchProperty({ type: 'text' })
  description?: string;

  @ApiProperty({
    description: 'Is this institution type legacy?',
    type: Boolean,
    nullable: true,
  })
  @OpenSearchProperty({ type: 'integer' })
  legacy?: boolean;
}

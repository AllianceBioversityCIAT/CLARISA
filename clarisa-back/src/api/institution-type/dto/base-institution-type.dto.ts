import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class BaseInstitutionTypeDto {
  @ApiProperty({
    description: 'The id of the institution type',
    type: Number,
    minimum: 1,
  })
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @ApiProperty({
    description: 'The name of the institution type',
    type: String,
  })
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @ApiProperty({
    description: 'The parent of the institution type',
    type: () => BaseInstitutionTypeDto,
    nullable: true,
  })
  @OpenSearchProperty({ type: 'object', nestedType: BaseInstitutionTypeDto })
  parent?: BaseInstitutionTypeDto;
}

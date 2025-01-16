import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionCountryDto } from './institution-country.dto';

export class InstitutionDto {
  @ApiProperty({
    description: 'The id of the institution',
    minimum: 1,
    type: Number,
  })
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @ApiProperty({
    description: 'The name of the institution',
    type: String,
  })
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @ApiProperty({
    description: 'The acronym of the institution',
    type: String,
    nullable: true,
  })
  @OpenSearchProperty({ type: 'text' })
  acronym: string;

  @ApiProperty({
    description: 'The link of the website of the institution',
    type: String,
    nullable: true,
  })
  @OpenSearchProperty({ type: 'text' })
  websiteLink: string;

  @ApiProperty({
    description: 'The date whe the institution was added',
    type: Date,
  })
  @OpenSearchProperty({ type: 'date' })
  added: Date;

  @ApiProperty({
    description: 'The type of the institution',
    type: InstitutionTypeDto,
  })
  @OpenSearchProperty({ type: 'object', nestedType: InstitutionTypeDto })
  institutionType: InstitutionTypeDto;

  @ApiProperty({
    description: 'The country offices linked to the institution',
    type: [InstitutionCountryDto],
  })
  @OpenSearchProperty({ type: 'nested', nestedType: InstitutionCountryDto })
  countryOfficeDTO: InstitutionCountryDto[];

  @ApiProperty({
    description: 'Is the institution active?',
    type: Boolean,
  })
  @OpenSearchProperty({ type: 'integer' })
  is_active?: boolean;
}

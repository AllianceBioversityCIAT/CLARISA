import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionCountryDto } from './institution-country.dto';

export class InstitutionDto {
  @OpenSearchProperty({ type: 'integer' })
  @ApiProperty({
    description: 'The id of the institution',
    minimum: 1,
    type: Number,
  })
  code: number;

  @OpenSearchProperty({ type: 'text' })
  @ApiProperty({
    description: 'The name of the institution',
    type: String,
  })
  name: string;

  @OpenSearchProperty({ type: 'text' })
  @ApiProperty({
    description: 'The acronym of the institution',
    type: String,
    nullable: true,
  })
  acronym: string;

  @OpenSearchProperty({ type: 'text' })
  @ApiProperty({
    description: 'The link of the website of the institution',
    type: String,
    nullable: true,
  })
  websiteLink: string;

  @OpenSearchProperty({ type: 'date' })
  @ApiProperty({
    description: 'The date whe the institution was added',
    type: Date,
  })
  added: Date;

  @OpenSearchProperty({ type: 'object', nestedType: InstitutionTypeDto })
  @ApiProperty({
    description: 'The type of the institution',
    type: InstitutionTypeDto,
  })
  institutionType: InstitutionTypeDto;

  @OpenSearchProperty({ type: 'nested', nestedType: InstitutionCountryDto })
  @ApiProperty({
    description: 'The country offices linked to the institution',
    type: [InstitutionCountryDto],
  })
  countryOfficeDTO: InstitutionCountryDto[];

  @OpenSearchProperty({ type: 'integer' })
  @ApiProperty({
    description: 'Is the institution active?',
    type: Boolean,
  })
  is_active?: boolean;
}

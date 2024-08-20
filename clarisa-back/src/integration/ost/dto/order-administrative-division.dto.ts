import { ApiProperty } from '@nestjs/swagger';

export class AdminCodesDto {
  @ApiProperty({
    description: 'The ISO 3166-2 code of the administrative division',
    type: String,
  })
  public ISO3166_2: string;
}

export class OrderAministrativeDivisionDto {
  @ApiProperty({
    description: 'The administrative code v1 of the administrative division',
    type: Number,
  })
  public adminCode1: number;

  @ApiProperty({
    description: 'The longitude of the administrative division',
    type: Number,
  })
  public lng: number;

  @ApiProperty({
    description: 'The Geoname id of the administrative division',
    type: Number,
  })
  public geonameId: number;

  @ApiProperty({
    description: 'The toponym name of the administrative division',
    type: String,
  })
  public toponymName: string;

  @ApiProperty({
    description: 'The Geoname country id of the administrative division',
    type: Number,
  })
  public countryId: number;

  @ApiProperty({
    description: 'The fcl(?) of the administrative division',
    type: String,
  })
  public fcl: string;

  @ApiProperty({
    description: 'The population of the administrative division',
    type: Number,
  })
  public population: number;

  @ApiProperty({
    description:
      'The ISO Alpha-2 code of the country from the administrative division',
    type: String,
  })
  public countryCode: string;

  @ApiProperty({
    description: 'The name of the administrative division',
    type: String,
  })
  public name: string;

  @ApiProperty({
    description: 'The fclName(?) of the administrative division',
    type: String,
  })
  public fclName: string;

  @ApiProperty({
    description: 'The administrative codes of the administrative division',
    type: AdminCodesDto,
  })
  public adminCodes1: AdminCodesDto;

  @ApiProperty({
    description: 'The name of the country of the administrative division',
    type: String,
  })
  public countryName: string;

  @ApiProperty({
    description: 'The fcodeName(?) of the administrative division',
    type: String,
  })
  public fcodeName: string;

  @ApiProperty({
    description: 'The administrative name of the administrative division',
    type: String,
  })
  public adminName1: string;

  @ApiProperty({
    description: 'The latitude of the administrative division',
    type: Number,
  })
  public lat: number;

  @ApiProperty({
    description: 'The fcode(?) of the administrative division',
    type: String,
  })
  public fcode: string;
}

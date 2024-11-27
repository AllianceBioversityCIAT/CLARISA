import { IsNotEmpty, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreatePartnerRequestDto } from './create-partner-request.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePartnerRequestDto extends PartialType(
  CreatePartnerRequestDto,
) {
  @ApiProperty({
    description: 'The id of the partner request to update',
    minimum: 1,
    type: Number,
  })
  @Min(1)
  id: number;

  @ApiProperty({
    description:
      'The justification for the modification of the partner request',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  modification_justification: string;
}

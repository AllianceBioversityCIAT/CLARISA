import { PartialType } from '@nestjs/swagger';
import { CreateGlobalParameterDto } from './create-global-parameter.dto';

export class UpdateGlobalParameterDto extends PartialType(CreateGlobalParameterDto) {}

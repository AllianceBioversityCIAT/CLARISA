import { PickType } from '@nestjs/swagger';
import { CreateMisDto } from '../../mis/dto/create-mis.dto';

export class CreateAppSecretMisDto extends PickType(CreateMisDto, [
  'acronym',
  'environment',
]) {}

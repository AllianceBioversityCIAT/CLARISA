import { PartialType } from '@nestjs/mapped-types';
import { CreateFrameworkDto } from './create-framework.dto';

export class UpdateFrameworkDto extends PartialType(CreateFrameworkDto) {}

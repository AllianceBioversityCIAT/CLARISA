import { OmitType } from '@nestjs/mapped-types';
import { Framework } from '../entities/framework.entity';

export class FrameworkDto extends OmitType(Framework, ['auditableFields']) {}

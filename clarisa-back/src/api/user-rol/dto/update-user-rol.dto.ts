import { PartialType } from '@nestjs/mapped-types';
import { CreateUserRolDto } from './create-user-rol.dto';

export class UpdateUserRolDto extends PartialType(CreateUserRolDto) {
    id:number;
}

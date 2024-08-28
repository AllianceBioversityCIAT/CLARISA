import { SimpleRoleDto } from '../../role/dto/simple-role.dto';

export class CreateUserDto {
  email: string;
  password?: string;
  roles: SimpleRoleDto[];
}

import { User } from '../../api/user/entities/user.entity';

export interface LoginDto {
  access_token: string;
  user: Partial<User> & { name: string };
}

import { CreateAppSecretDto } from './create-app-secret.dto';

export class AppSecretDto extends CreateAppSecretDto {
  client_id: string;
  secret?: string;
}

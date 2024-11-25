import { SimpleMisDto } from '../../mis/dto/simple-mis.dto';

export class CreateAppSecretDto {
  sender_mis: SimpleMisDto;
  receiver_mis: SimpleMisDto;
}

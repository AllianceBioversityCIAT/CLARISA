import { AuthDto } from '../../dto/auth.dto';

export class MessageDto {
  public auth: AuthDto;
  public data: ConfigMessageDto;
}

export class ConfigMessageDto {
  from?: FromBody;
  emailBody: EmailBody;
}

class EmailBody {
  subject: string;
  to: string;
  cc?: string;
  bcc?: string;
  message: EmailBodyMessage;
}

class EmailBodyMessage {
  text?: string;
  socketFile?: Buffer;
  file?: Buffer;
}

class FromBody {
  email: string;
  name?: string;
}

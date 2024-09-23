import { BaseMicroservice } from '../base-microservice';
import { MessageDto } from './dto/message.dto';

export class MessagingMicroservice extends BaseMicroservice {
  constructor() {
    super('cgiar_ms_test_mailer_queue');
  }

  sendMail(data: MessageDto) {
    return this._send('send', data);
  }
}

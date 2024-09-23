import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { env } from 'process';

export class BaseMicroservice {
  private client: ClientProxy;

  constructor(queuePath: string) {
    const queueHost: string = `amqps://${env.MQ_USER}:${env.MQ_PASSWORD}@${env.MQ_HOST}`;
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [queueHost],
        queue: queuePath,
        queueOptions: {
          durable: true,
        },
      },
    });
  }

  protected _send<T>(pattern: string, data: T) {
    return this.client.emit(pattern, data).subscribe();
  }
}

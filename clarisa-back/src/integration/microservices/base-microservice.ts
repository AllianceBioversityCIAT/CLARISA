import { Logger } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { env } from 'process';

export class BaseMicroservice {
  private client: ClientProxy;
  protected logger: Logger;

  constructor(queuePath: string, loggerContext: string) {
    const queueHost: string = `amqps://${env.MQ_USER}:${env.MQ_PASSWORD}@${env.MQ_HOST}`;
    this.logger = new Logger(loggerContext);
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

    this.client
      .connect()
      .then(() => {
        this.logger.log('Connected to messaging queue');
      })
      .catch((error) => {
        this.logger.error('Error connecting to messaging queue', error);
      });
  }

  protected _emit<T>(pattern: string, data: T) {
    return this.client.emit(pattern, data);
  }
}

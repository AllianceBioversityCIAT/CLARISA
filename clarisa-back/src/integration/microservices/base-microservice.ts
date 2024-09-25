import { Logger } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { AppConfig } from '../../shared/utils/app-config';

/**
 * BaseMicroservice class is responsible for establishing a connection to a message queue
 * and providing a method to emit events to the queue.
 */
export class BaseMicroservice {
  /**
   * @private
   * @property {ClientProxy} client - An instance of ClientProxy used for communication with microservices.
   */
  private client: ClientProxy;

  /**
   * @protected
   * @property {Logger} logger - An instance of the Logger class used for logging messages within the microservice.
   */
  protected logger: Logger;

  /**
   *
   * @param {string} queuePath - The path of the queue to connect to.
   * @param {string} loggerContext - The context for the logger.
   */
  constructor(queuePath: string, loggerContext: string, appConfig: AppConfig) {
    const queueHost: string = `amqps://${appConfig.mqUser}:${appConfig.mqPassword}@${appConfig.mqHost}`;
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
        this.logger.log(`Connected to ${loggerContext} queue`);
      })
      .catch((error) => {
        this.logger.error(`Error connecting to ${loggerContext} queue`, error);
      });
  }

  /**
   * Emits an event with the specified pattern and data.
   *
   * @template T - The type of the data to be emitted.
   * @param {string} pattern - The pattern or event name to emit.
   * @param {T} data - The data to be emitted with the event.
   * @returns The result of the emit operation.
   */
  protected _emit<T>(pattern: string, data: T) {
    return this.client.emit(pattern, data);
  }
}

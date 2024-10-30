import { Logger } from '@nestjs/common';

export abstract class BaseAuthenticator {
  protected _logger: Logger;
  constructor(className: string) {
    this._logger = new Logger(className);
  }

  abstract authenticate(username: string, password: string): Promise<boolean>;
}

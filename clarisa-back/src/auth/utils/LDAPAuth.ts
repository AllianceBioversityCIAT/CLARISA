import { BaseAuthenticator } from './interface/BaseAuthenticator';
import ActiveDirectory from 'activedirectory';
import config from 'src/shared/config/config';
import { BaseMessageDTO } from './BaseMessageDTO';
import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';
import { InternalServerError } from '../../shared/errors/internal-server-error';

@Injectable()
export class LDAPAuth extends BaseAuthenticator {
  private ad = new ActiveDirectory(config.active_directory);

  constructor() {
    super(LDAPAuth.name);
  }

  authenticate(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.ad.authenticate(username, password, (err, auth) => {
        this._logger.verbose({ auth });
        if (auth) {
          this._logger.verbose('Authenticated AD!', JSON.stringify(auth));
          return resolve(auth);
        }

        if (err) {
          const notFound: BaseMessageDTO = {
            name: 'SERVER_NOT_FOUND',
            description: `There was an internal server error while using the AD: ${err.lde_message}.`,
          };
          if (err.errno == 'ENOTFOUND') {
            notFound.name = 'SERVER_NOT_FOUND';
            notFound.description = 'AD server not found';
          }

          this._logger.error('ERROR AUTH: ' + JSON.stringify(err));
          return reject(
            new InternalServerError(notFound.description, {
              name: notFound.name,
              ...err,
            }),
          );
        } else {
          this._logger.error('Authentication failed!');
          const err: BaseMessageDTO = {
            name: 'INVALID_CREDENTIALS',
            description: 'The supplied credentials are invalid.',
          };

          this._logger.error('ERROR: ' + JSON.stringify(err));
          return reject(new UnauthorizedError(err.description, err));
        }
      });
    });
  }
}

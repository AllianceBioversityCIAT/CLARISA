import { BaseAuthenticator } from './interface/BaseAuthenticator';
import ActiveDirectory from 'activedirectory';
import config from 'src/shared/config/config';
import { Injectable, Logger } from '@nestjs/common';
import { contentCompare } from '../../shared/utils/string-content-comparator';
import { ADAuthError } from '../../shared/errors/ad-auth.error';

@Injectable()
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
export class LDAPAuth implements BaseAuthenticator {
  private readonly _ad: ActiveDirectory = new ActiveDirectory(
    config.active_directory,
  );
  private readonly _logger: Logger = new Logger(LDAPAuth.name);

  authenticate(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._ad.authenticate(username, password, (err, auth) => {
        if (auth) {
          this._logger.log('Authenticated AD!', JSON.stringify(auth));
          resolve(true);
          return;
        }

        let errorName: string = 'SERVER_NOT_FOUND';
        let errorDescription: string = `There was an internal server error: ${err.lde_message}`;
        if (err) {
          this._logger.warn(`ERROR AUTH: ${JSON.stringify(err)}`);
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers
          if (contentCompare('ENOTFOUND', err.errno as string) === 0) {
            errorName = 'SERVER_NOT_FOUND';
            errorDescription = 'Server not found';
          }

          reject(
            new ADAuthError(err, {
              name: errorName,
              message: errorDescription,
            }),
          );
          return;
        } else {
          this._logger.warn(
            `Authentication failed for username "${username}"!`,
          );

          errorName = 'INVALID_CREDENTIALS';
          errorDescription = 'The supplied credentials are invalid';

          this._logger.warn(`ERROR: ${JSON.stringify(err)}`);
          reject(new ADAuthError(err));
          return;
        }
      });
    });
  }
}

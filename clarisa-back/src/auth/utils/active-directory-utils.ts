import { Injectable, Logger } from '@nestjs/common';
import config from 'src/shared/config/config';
import ActiveDirectory from 'activedirectory';
import { BaseMessageDTO } from './BaseMessageDTO';
import { InternalServerError } from '../../shared/errors/internal-server-error';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

@Injectable()
export class ActiveDirectoryUtils {
  private ad = new ActiveDirectory(config.active_directory);
  private _logger = new Logger(ActiveDirectoryUtils.name);

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
            description: `There was an internal server error while using the AD: ${err.lde_message}`,
          };
          if (err.errno == 'ENOTFOUND') {
            notFound.name = 'SERVER_NOT_FOUND';
            notFound.description = 'AD server not found';
          }

          this._logger.error('ERROR AUTH: ' + JSON.stringify(err));
          return reject(
            new InternalServerError(notFound.description, notFound),
          );
        } else {
          this._logger.error('Authentication failed!');
          const err: BaseMessageDTO = {
            name: 'INVALID_CREDENTIALS',
            description: 'The supplied credentials are invalid',
          };

          this._logger.error('ERROR: ' + JSON.stringify(err));
          return reject(new UnauthorizedError(err.description, err));
        }
      });
    });
  }

  findByEmail(email: string) /*: Promise<ADUserDto | BaseMessageDTO>*/ {
    return { email };
    /*return new Promise((resolve, reject) => {
      //   if (!email) {
      //     const notFound: BaseMessageDTO = {
      //       name: 'INVALID_EMAIL',
      //       description: `The email is invalid`,
      //       httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
      //     };
      //     return reject(notFound);
      //   }

      this.ad.findUsers(email, (err, user: ADUserDto) => {
        if (err) {
          console.log('ERROR AUTH: ' + JSON.stringify(err));
          const notFound: BaseMessageDTO = {
            name: 'SERVER_NOT_FOUND',
            description: `There was an internal server error: ${err.lde_message}`,
          };
          if (err.errno == 'ENOTFOUND') {
            notFound.name = 'SERVER_NOT_FOUND';
            notFound.description = 'Server not found';
          }
          // console.log(err)
          // console.log(typeof err)

          return reject(notFound);
        } else if (!user) {
          console.log('no user found with email: ' + email);
        } else {
          console.log('Authenticated AD!', JSON.stringify(user));
          return resolve(user);
        }
      });
    });*/
  }
}

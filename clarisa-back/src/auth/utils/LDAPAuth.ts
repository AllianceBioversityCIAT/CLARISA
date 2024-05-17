import { BaseAuthenticator } from './interface/BaseAuthenticator';
import ActiveDirectory from 'activedirectory';
import config from 'src/shared/config/config';
import { BaseMessageDTO } from './BaseMessageDTO';
import { Injectable, HttpStatus } from '@nestjs/common';

@Injectable()
export class LDAPAuth implements BaseAuthenticator {
  private ad = new ActiveDirectory(config.active_directory);

  authenticate(
    username: string,
    password: string,
  ): Promise<boolean | BaseMessageDTO> {
    return new Promise((resolve, reject) => {
      this.ad.authenticate(username, password, (err, auth) => {
        console.log({ auth });
        if (auth) {
          console.log('Authenticated AD!', JSON.stringify(auth));
          resolve(auth);
          return;
        }
        if (err) {
          console.log(`ERROR AUTH: ${JSON.stringify(err)}`);
          const notFound: BaseMessageDTO = {
            name: 'SERVER_NOT_FOUND',
            description: `There was an internal server error: ${err.lde_message}`,
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
          };
          if (err.errno == 'ENOTFOUND') {
            notFound.name = 'SERVER_NOT_FOUND';
            notFound.description = 'Server not found';
          }
          // console.log(err)
          // console.log(typeof err)

          reject(notFound);
          return;
        } else {
          console.log('Authentication failed!');
          const err: BaseMessageDTO = {
            name: 'INVALID_CREDENTIALS',
            description: 'The supplied credentials are invalid',
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
          };

          console.log(`ERROR: ${JSON.stringify(err)}`);
          reject(err);
          return;
        }
      });
    });
  }
}

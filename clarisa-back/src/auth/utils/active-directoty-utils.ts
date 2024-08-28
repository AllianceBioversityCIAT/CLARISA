import { HttpStatus, Injectable } from '@nestjs/common';
import config from 'src/shared/config/config';
import ActiveDirectory from 'activedirectory';
import { BaseMessageDTO } from './BaseMessageDTO';
import { ADUserDto } from '../dto/ad-user.dto';

@Injectable()
export class ActiveDirectoryUtils {
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
          return resolve(auth);
        }
        if (err) {
          console.log('ERROR AUTH: ' + JSON.stringify(err));
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

          return reject(notFound);
        } else {
          console.log('Authentication failed!');
          const err: BaseMessageDTO = {
            name: 'INVALID_CREDENTIALS',
            description: 'The supplied credentials are invalid',
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
          };

          console.log('ERROR: ' + JSON.stringify(err));
          return reject(err);
        }
      });
    });
  }

  findByEmail(email: string) /*: Promise<ADUserDto | BaseMessageDTO>*/ {
    return new Promise((resolve, reject) => {
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
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
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
    });
  }
}

import { BaseAuthenticator } from './interface/BaseAuthenticator';
import ActiveDirectory from 'activedirectory';
import config from 'src/shared/config/config';
import { BaseMessageDTO } from './BaseMessageDTO';
import { Injectable } from '@nestjs/common';
import { describeLdapFailure } from './ldap-error';

@Injectable()
export class LDAPAuth implements BaseAuthenticator {
  private ad = new ActiveDirectory(config.active_directory);

  authenticate(
    username: string,
    password: string,
  ): Promise<boolean | BaseMessageDTO> {
    return new Promise((resolve, reject) => {
      this.ad.authenticate(username, password, (err, auth) => {
        if (auth) {
          return resolve(auth);
        }

        // 🛑 A wrong password is NOT a server failure. Which of the two this is
        // — and therefore whether the API answers 401 or 500 — is decided in
        // `describeLdapFailure`, where it can be tested: this class cannot be
        // imported by a spec because `config.ts` is not in the repository.
        const failure = describeLdapFailure(err);

        if (failure.name === 'SERVER_NOT_FOUND') {
          console.log('ERROR AUTH: ' + JSON.stringify(err));
        }

        return reject(failure);
      });
    });
  }
}

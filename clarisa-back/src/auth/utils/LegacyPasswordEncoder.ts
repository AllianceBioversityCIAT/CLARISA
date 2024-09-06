import { MD5 } from 'crypto-js';
import { BasePasswordEncoder } from './interface/BasePasswordEncoder';

import { Injectable } from '@nestjs/common';

@Injectable()
export class LegacyPasswordEncoder implements BasePasswordEncoder {
  matches(hashedPassword: string, incomingPassword: string): boolean {
    return hashedPassword === MD5(incomingPassword).toString();
  }

  /**
   * Encodes a password, using MD5
   * @deprecated MD5 is not really a good way to store a password, so please use the BCryptPasswordEncoder instead
   * @param incomingPassword the password to encode
   * @returns a password encoded, using MD5
   */
  encode(incomingPassword: string): string {
    return MD5(incomingPassword).toString();
  }
}

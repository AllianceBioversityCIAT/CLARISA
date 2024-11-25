import { BasePasswordEncoder } from './interface/BasePasswordEncoder';

import MD5 from 'crypto-js/md5';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LegacyPasswordEncoder implements BasePasswordEncoder {
  /**
   * Compares a hashed password with an incoming password.
   *
   * @param hashedPassword - The hashed password to compare against.
   * @param incomingPassword - The incoming password to be hashed and compared.
   * @returns `true` if the hashed password matches the hashed incoming password, otherwise `false`.
   */
  matches(hashedPassword: string, incomingPassword: any): boolean {
    return hashedPassword === MD5(incomingPassword).toString();
  }

  /**
   * Encodes the given password using the MD5 hashing algorithm.
   *
   * @deprecated MD5 is not really a good way to store a password, so please use the BCryptPasswordEncoder instead
   * @param incomingPassword - The password to be encoded.
   * @returns The MD5 hash of the incoming password as a string.
   */
  encode(incomingPassword: any): string {
    return MD5(incomingPassword).toString();
  }
}

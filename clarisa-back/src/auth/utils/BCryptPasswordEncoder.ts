import { BasePasswordEncoder } from './interface/BasePasswordEncoder';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { Injectable, Logger } from '@nestjs/common';
import 'dotenv/config';
import { env } from 'process';

@Injectable()
export class BCryptPasswordEncoder implements BasePasswordEncoder {
  private readonly _logger: Logger = new Logger(BCryptPasswordEncoder.name);
  public matches(hashedPassword: string, incomingPassword: string): boolean {
    try {
      const result = compareSync(incomingPassword, hashedPassword);
      return typeof result === 'boolean' ? result : false;
    } catch (error) {
      this._logger.log(error);
      return false;
    }
  }

  /**
   * Encodes a password, using BCrypt
   * @param incomingPassword the password to be encoded
   * @returns a password encoded, using BCrypt
   */
  public encode(incomingPassword: string): string {
    const salt = genSaltSync(Number(env.BCRYPT_SALT_ROUNDS));
    return hashSync(incomingPassword, salt);
  }
}

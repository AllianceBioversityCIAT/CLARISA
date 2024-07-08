import { BasePasswordEncoder } from './interface/BasePasswordEncoder';
import * as bcrypt from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { env } from 'process';

@Injectable()
export class BCryptPasswordEncoder extends BasePasswordEncoder {
  public matches(hashedPassword: string, incomingPassword: any): boolean {
    try {
      return bcrypt.compareSync(incomingPassword, hashedPassword);
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  /**
   * Encodes a password, using BCrypt
   * @param incomingPassword the password to be encoded
   * @returns a password encoded, using BCrypt
   */
  public encode(incomingPassword: any): string {
    const salt = bcrypt.genSaltSync(Number(env.BCRYPT_SALT_ROUNDS));
    return bcrypt.hashSync(incomingPassword, salt);
  }
}

import { BasePasswordEncoder } from './interface/BasePasswordEncoder';
import * as bcrypt from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../shared/utils/app-config';

/**
 * The `BCryptPasswordEncoder` class provides methods to encode passwords using the bcrypt hashing algorithm
 * and to compare hashed passwords with plain text passwords.
 */
@Injectable()
export class BCryptPasswordEncoder implements BasePasswordEncoder {
  constructor(private appConfig: AppConfig) {}

  /**
   * Compares a hashed password with an incoming password to check if they match.
   *
   * @param hashedPassword - The hashed password to compare against.
   * @param incomingPassword - The incoming password to compare.
   * @returns `true` if the passwords match, `false` otherwise.
   */
  public matches(hashedPassword: string, incomingPassword: any): boolean {
    try {
      return bcrypt.compareSync(incomingPassword, hashedPassword);
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  /**
   * Encodes the given password using bcrypt hashing algorithm.
   *
   * @param incomingPassword - The password to be encoded.
   * @returns The bcrypt hashed password.
   */
  public encode(incomingPassword: any): string {
    const salt = bcrypt.genSaltSync(Number(this.appConfig.bcryptSaltRounds));
    return bcrypt.hashSync(incomingPassword, salt);
  }
}

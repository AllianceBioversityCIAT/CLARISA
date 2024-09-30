import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UserData } from 'src/shared/interfaces/user-data';
import { AppConfig } from '../shared/utils/app-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private appConfig: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwtSecret,
    });
  }

  async validate(payload: any): Promise<UserData> {
    return {
      userId: payload.sub,
      email: payload.login,
      permissions: payload.permissions,
    };
  }
}

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../shared/utils/app-config';
import { UserDataDto } from '../shared/entities/dtos/user-data.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private appConfig: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwtSecret,
    });
  }

  async validate(payload: any): Promise<UserDataDto> {
    return {
      userId: payload.sub,
      email: payload.login,
      permissions: payload.permissions,
    };
  }
}

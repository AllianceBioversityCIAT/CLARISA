import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { BCryptPasswordEncoder } from './utils/BCryptPasswordEncoder';
import { DBAuth } from './utils/DBAuth';
import { LDAPAuth } from './utils/LDAPAuth';
import { LegacyPasswordEncoder } from './utils/LegacyPasswordEncoder';
import { env } from 'process';
import 'dotenv/config';
import { UserModule } from '../api/user/user.module';
import { QaTokenAuthModule } from './qa-token-auth/qa-token-auth.module';

@Module({
  controllers: [AuthController],
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_TIME },
    }),
    QaTokenAuthModule,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    LegacyPasswordEncoder,
    BCryptPasswordEncoder,
    LDAPAuth,
    DBAuth,
  ],
  exports: [AuthService],
})
export class AuthModule {}

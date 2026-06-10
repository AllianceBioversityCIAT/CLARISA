import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../../api/user/user.module';
import { AuthModule } from '../../auth/auth.module';
import { AuthService } from '../../auth/auth.service';
import { ApiKeyModule } from '../../api/api-key/api-key.module';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionGuard } from './permission.guard';
import { CompositeAuthGuard } from './composite-auth.guard';
import { HybridAuthorizationGuard } from './hybrid-authorization.guard';

@Module({
  imports: [UserModule, AuthModule, JwtModule, ApiKeyModule],
  providers: [
    AuthService,
    ApiKeyGuard,
    JwtAuthGuard,
    PermissionGuard,
    CompositeAuthGuard,
    HybridAuthorizationGuard,
  ],
  exports: [
    ApiKeyGuard,
    JwtAuthGuard,
    PermissionGuard,
    CompositeAuthGuard,
    HybridAuthorizationGuard,
  ],
})
export class GuardsModule {}

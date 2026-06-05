import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../../api/user/user.module';
import { AuthModule } from '../../auth/auth.module';
import { AuthService } from '../../auth/auth.service';
import { ApiKeyModule } from '../../api/api-key/api-key.module';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [UserModule, AuthModule, JwtModule, ApiKeyModule],
  providers: [AuthService, ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class GuardsModule {}

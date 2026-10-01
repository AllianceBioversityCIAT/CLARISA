import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AccessAdminController } from './access-admin.controller';
import { AccessAdminRepository } from './access-admin.repository';
import { AccessAdminService } from './access-admin.service';

@Module({
  imports: [UserModule],
  controllers: [AccessAdminController],
  providers: [AccessAdminService, AccessAdminRepository],
})
export class AccessAdminModule {}

import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from '../role/repositories/role.repository';
import { UserMisRepository } from './repositories/user-mis.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { UserAccessService } from './user-access.service';
import { UserAccessController } from './user-access.controller';

@Module({
  // `UserAccessController` first: `me/access` is matched before any `:param` route.
  controllers: [UserAccessController, UserController],
  providers: [
    UserService,
    UserRepository,
    RoleRepository,
    UserMisRepository,
    UserRoleRepository,
    UserAccessService,
  ],
  exports: [UserService, UserRepository, UserAccessService],
})
export class UserModule {}

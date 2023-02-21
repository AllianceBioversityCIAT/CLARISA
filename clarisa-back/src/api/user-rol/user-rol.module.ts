import { Module } from '@nestjs/common';
import { UserRolService } from './user-rol.service';
import { UserRolController } from './user-rol.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRol } from './entities/user-rol.entity';
import { UserRolRepository } from './repositories/user-rol.repository';
import { User } from 'src/api/user/entities/user.entity';
import { UserService } from '../user/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRol, User])],
  controllers: [UserRolController],
  providers: [UserRolService, UserRolRepository, UserService]
})
export class UserRolModule {}

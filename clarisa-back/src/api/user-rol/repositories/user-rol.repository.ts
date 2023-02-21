import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserRol } from '../entities/user-rol.entity';
import { UserService } from '../../user/user.service';


@Injectable()
export class UserRolRepository extends Repository<UserRol> {
  constructor(private dataSource: DataSource,
    private userData: UserService) {
    super(UserRol, dataSource.createEntityManager());
  }

  async testingRepo(){
    return await this.userData.findAll();
  }


}
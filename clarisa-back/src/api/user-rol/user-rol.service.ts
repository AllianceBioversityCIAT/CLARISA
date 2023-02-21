import { Injectable } from '@nestjs/common';
import { CreateUserRolDto } from './dto/create-user-rol.dto';
import { UpdateUserRolDto } from './dto/update-user-rol.dto';
import { UserRolRepository } from './repositories/user-rol.repository';

@Injectable()
export class UserRolService {
  constructor(
    
    private userRolRepository: UserRolRepository,
    
  ) {}


  async findUser(){
    return await this.userRolRepository.testingRepo()
  }
}

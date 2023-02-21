import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserRolService } from './user-rol.service';
import { CreateUserRolDto } from './dto/create-user-rol.dto';
import { UpdateUserRolDto } from './dto/update-user-rol.dto';

@Controller()
export class UserRolController {
  constructor(private readonly userRolService: UserRolService) {}

 @Get('testing')
 async findAll(){
  return await this.userRolService.findUser()
 }
}
